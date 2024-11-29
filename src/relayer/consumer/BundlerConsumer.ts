import { ConsumeMessage } from "amqplib";
import { encodeFunctionData } from "viem";
import { ENTRY_POINT_ABI } from "entry-point-gas-estimations/dist/gas-estimator/entry-point-v6";
import { ICacheService } from "../../common/cache";
import { logger } from "../../common/logger";
import { IQueue } from "../../common/queue";
import {
  SendUserOperation,
  EntryPointMapType,
  EVMRawTransactionType,
  TransactionType,
} from "../../common/types";
import {
  getFailedTransactionRetryCountKey,
  getRetryTransactionCountKey,
} from "../../common/utils";
import { IEVMAccount } from "../account";
import { IRelayerManager } from "../relayer-manager";
import { ITransactionService } from "../transaction-service";
import { ITransactionConsumer } from "./interface/ITransactionConsumer";
import { BundlerConsumerParamsType } from "./types";
import { STATUSES } from "../../server/api/shared/middleware";
import { ENTRY_POINT_V07_ABI } from "../../common/entrypoint-v7/abiv7";
import {
  isUserOpV06,
  packUserOperation,
} from "../../common/entrypoint-v7/PackedUserOperation";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});
export class BundlerConsumer
  implements ITransactionConsumer<IEVMAccount, EVMRawTransactionType>
{
  private transactionType: TransactionType = TransactionType.BUNDLER;

  private queue: IQueue<SendUserOperation>;

  chainId: number;

  entryPointMap: EntryPointMapType;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  constructor(bundlerConsumerParamas: BundlerConsumerParamsType) {
    const { options, queue, relayerManager, transactionService, cacheService } =
      bundlerConsumerParamas;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.transactionService = transactionService;
    this.cacheService = cacheService;
  }

  onMessageReceived = async (msg?: ConsumeMessage): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(
        msg.content.toString(),
      );

      const topLog = log.child({
        msg: transactionDataReceivedFromQueue,
        chainId: this.chainId,
      });

      topLog.info(`BundlerConsumer.onMessageReceived`);
      this.queue.ack(msg);

      const sendTransactionWithRetry = async (): Promise<void> => {
        // get active relayer
        const activeRelayer = await this.relayerManager.getActiveRelayer();

        if (activeRelayer) {
          const { userOp } = transactionDataReceivedFromQueue;

          const _log = topLog.child({
            activeRelayer: activeRelayer.address,
          });

          _log.info("Aquired active relayer for UserOperation");

          const isV06 = isUserOpV06(userOp);
          let data;
          if (isV06) {
            data = encodeFunctionData({
              abi: ENTRY_POINT_ABI,
              functionName: "handleOps",
              args: [[userOp], activeRelayer.getPublicKey() as `0x${string}`],
            });
          } else {
            const packed = packUserOperation(userOp);

            data = encodeFunctionData({
              abi: ENTRY_POINT_V07_ABI,
              functionName: "handleOps",
              args: [[packed], activeRelayer.getPublicKey() as `0x${string}`],
            });
          }
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
            _log.info(`Calling transactionService.sendTransaction`);

            const transactionServiceResponse =
              await this.transactionService.sendTransaction(
                transactionDataReceivedFromQueue,
                activeRelayer,
                this.transactionType,
                this.relayerManager.name,
              );

            _log.info(
              {
                response: transactionServiceResponse,
              },
              `transactionService responded`,
            );

            const isBundlerLowOnFunds =
              transactionServiceResponse.state === "failed" &&
              transactionServiceResponse.code === STATUSES.FUND_BUNDLER;

            if (isBundlerLowOnFunds) {
              log.info(
                `Relayer could not execute transaction due to low funds. Sending bundler for funding`,
              );
              this.relayerManager.fundAndAddRelayerToActiveQueue(
                activeRelayer.getPublicKey(),
              );
              return await sendTransactionWithRetry();
            }

            _log.info(`Adding relayer back to active relayer queue`);

            await this.relayerManager.addActiveRelayer(
              activeRelayer.getPublicKey(),
            );

            _log.info(`Added relayer back to active relayer queue`);

            if (transactionServiceResponse.state === "success") {
              _log.info(`Transaction sent successfully`);
            } else {
              _log.error(
                { err: transactionServiceResponse?.error || "unknown error" },
                `Transaction failed`,
              );
            }

            await this.cacheService.delete(
              getFailedTransactionRetryCountKey(
                transactionDataReceivedFromQueue.transactionId,
                this.chainId,
              ),
            );
          } catch (err: unknown) {
            _log.error(
              { err },
              `Error in BundlerConsumer.sendTransactionWithRetry`,
            );

            _log.info(`Adding relayer back to active relayer queue`);

            await this.relayerManager.addActiveRelayer(
              activeRelayer.getPublicKey(),
            );

            _log.info(`Added relayer back to active relayer queue`);

            await this.cacheService.delete(
              getFailedTransactionRetryCountKey(
                transactionDataReceivedFromQueue.transactionId,
                this.chainId,
              ),
            );
          }
        } else {
          this.queue.publish(JSON.parse(msg.content.toString()));
          topLog.info(`No active relayer for user operation`);
        }
      };
      await sendTransactionWithRetry();
    }
    log.info({ chainId: this.chainId }, `Empty msg received from queue`);
  };
}
