/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
import { ConsumeMessage } from "amqplib";
import { encodeFunctionData } from "viem";
import { ENTRY_POINT_ABI } from "entry-point-gas-estimations";
import { ICacheService } from "../../common/cache";
import { logger } from "../../common/logger";
import { IQueue } from "../../common/queue";
import {
  BundlerTransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
  TransactionType,
} from "../../common/types";
import {
  customJSONStringify,
  getFailedTransactionRetryCountKey,
  getRetryTransactionCountKey,
  parseError,
} from "../../common/utils";
import { IEVMAccount } from "../account";
import { IRelayerManager } from "../relayer-manager";
import { ITransactionService } from "../transaction-service";
import { ITransactionConsumer } from "./interface/ITransactionConsumer";
import { BundlerConsumerParamsType } from "./types";
import { STATUSES } from "../../server/api/shared/middleware";
import { IMonitoringService } from "../../common/monitoring/interface";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});
export class BundlerConsumer
  implements ITransactionConsumer<IEVMAccount, EVMRawTransactionType>
{
  private transactionType: TransactionType = TransactionType.BUNDLER;

  private queue: IQueue<BundlerTransactionMessageType>;

  chainId: number;

  entryPointMap: EntryPointMapType;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  monitoringService: IMonitoringService;

  constructor(bundlerConsumerParamas: BundlerConsumerParamsType) {
    const { options, queue, relayerManager, transactionService, cacheService, monitoringService } =
      bundlerConsumerParamas;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.transactionService = transactionService;
    this.cacheService = cacheService;
    this.monitoringService = monitoringService;
    this.createMonitoringGauges();
  }

  private createMonitoringGauges() {
    this.monitoringService.createGauge({
      name: 'userop_received',
      help: 'Number of user operations received by the Bundler to send on chain',
      labelNames: ['bundler_consumer'],
    });
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
    // eslint-disable-next-line consistent-return
  ): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(
        msg.content.toString(),
      );
      log.info(
        `onMessage received in ${this.transactionType}: ${customJSONStringify(
          transactionDataReceivedFromQueue,
        )} for transactionId: ${
          transactionDataReceivedFromQueue.transactionId
        } on chainId: ${this.chainId}`,
      );
      this.queue.ack(msg);

      // eslint-disable-next-line consistent-return
      const sendTransactionWithRetry = async (): Promise<void> => {
        // get active relayer
        const activeRelayer = await this.relayerManager.getActiveRelayer();
        log.info(
          `Active relayer for ${
            this.transactionType
          } is ${activeRelayer?.getPublicKey()} for transactionId: ${
            transactionDataReceivedFromQueue.transactionId
          } on chainId: ${this.chainId}`,
        );

        if (activeRelayer) {
          const { userOp } = transactionDataReceivedFromQueue;

          log.info(
            `Setting active relayer: ${activeRelayer?.getPublicKey()} as beneficiary for userOp: ${customJSONStringify(
              userOp,
            )} for transactionId: ${
              transactionDataReceivedFromQueue.transactionId
            } on chainId: ${this.chainId}`,
          );

          const data = encodeFunctionData({
            abi: ENTRY_POINT_ABI,
            functionName: "handleOps",
            args: [[userOp], activeRelayer.getPublicKey() as `0x${string}`],
          });
          transactionDataReceivedFromQueue.data = data;

          await this.cacheService.set(
            getRetryTransactionCountKey(
              transactionDataReceivedFromQueue.transactionId,
              this.chainId,
            ),
            "0",
          );

          await this.cacheService.set(
            getFailedTransactionRetryCountKey(
              transactionDataReceivedFromQueue.transactionId,
              this.chainId,
            ),
            "0",
          );

          try {
            // call transaction service
            log.info(
              `Calling transactionService to sendTransaction for transactionId: ${transactionDataReceivedFromQueue.transactionId} on chainId: ${this.chainId}`,
            );
            const transactionServiceResponse =
              await this.transactionService.sendTransaction(
                transactionDataReceivedFromQueue,
                activeRelayer,
                this.transactionType,
                this.relayerManager.name,
              );
            log.info(
              `Response from transaction service for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for ${
                this.transactionType
              } after sending transaction on chainId: ${
                this.chainId
              }: ${customJSONStringify(transactionServiceResponse)}`,
            );
            if (
              transactionServiceResponse.state === "failed" &&
              transactionServiceResponse.code === STATUSES.FUND_BUNDLER
            ) {
              log.info(
                `Bundler: ${activeRelayer.getPublicKey()} could not execute transaction due to low fund for transactionId: ${
                  transactionDataReceivedFromQueue.transactionId
                } on chainId: ${this.chainId}. Sending bundler for funding`,
              );
              this.relayerManager.fundAndAddRelayerToActiveQueue(
                activeRelayer.getPublicKey(),
              );
              return await sendTransactionWithRetry();
            }
            log.info(
              `Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for transactionType: ${this.transactionType} on chainId: ${
                this.chainId
              }`,
            );
            await this.relayerManager.addActiveRelayer(
              activeRelayer.getPublicKey(),
            );
            log.info(
              `Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for transactionType: ${this.transactionType} on chainId: ${
                this.chainId
              }`,
            );
            if (transactionServiceResponse.state === "success") {
              log.info(
                `Transaction sent successfully for transactionId: ${transactionDataReceivedFromQueue.transactionId} for ${this.transactionType} on chain ${this.chainId}`,
              );
            } else {
              log.error(
                `Transaction failed with error: ${
                  transactionServiceResponse?.error || "unknown error"
                } for transactionId: ${
                  transactionDataReceivedFromQueue.transactionId
                } for ${this.transactionType} on chain ${this.chainId}`,
              );
            }
            await this.cacheService.delete(
              getFailedTransactionRetryCountKey(
                transactionDataReceivedFromQueue.transactionId,
                this.chainId,
              ),
            );
          } catch (error: any) {
            log.error(
              `Error in transaction service for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for transactionType: ${this.transactionType} on chainId: ${
                this.chainId
              } with error: ${customJSONStringify(parseError(error))}`,
            );
            log.info(
              `Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for transactionType: ${this.transactionType} on chainId: ${
                this.chainId
              }`,
            );
            this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
            log.info(
              `Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionId: ${
                transactionDataReceivedFromQueue.transactionId
              } for transactionType: ${this.transactionType} on chainId: ${
                this.chainId
              }`,
            );
            await this.cacheService.delete(
              getFailedTransactionRetryCountKey(
                transactionDataReceivedFromQueue.transactionId,
                this.chainId,
              ),
            );
          }
        } else {
          this.queue.publish(JSON.parse(msg.content.toString()));
          log.info(
            `No active relayer for transactionId: ${transactionDataReceivedFromQueue.transactionId} for transactionType: ${this.transactionType} on chainId: ${this.chainId}`,
          );
        }
      };
      await sendTransactionWithRetry();
    }
    log.info(
      `No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`,
    );
  };
}
