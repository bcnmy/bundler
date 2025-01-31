import { ConsumeMessage } from "amqplib";
import { logger } from "../../common/logger";
import { INetworkService } from "../../common/network";
import { IQueue } from "../../common/queue";
import { RetryTransactionQueueData } from "../../common/queue/types";
import { EVMRawTransactionType, TransactionType } from "../../common/types";
import { IEVMAccount } from "../account";
import { IRelayerManager } from "../relayer-manager";
import { ITransactionService } from "../transaction-service/interface/ITransactionService";
import { IRetryTransactionService } from "./interface/IRetryTransactionService";
import { EVMRetryTransactionServiceParamsType } from "./types";
import {
  customJSONStringify,
  getTransactionMinedKey,
  parseError,
} from "../../common/utils";
import { ICacheService } from "../../common/cache";
import { FlashbotsTxStatus } from "../../common/network/FlashbotsClient";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});
export class EVMRetryTransactionService
  implements IRetryTransactionService<IEVMAccount, EVMRawTransactionType>
{
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  chainId: number;

  queue: IQueue<RetryTransactionQueueData>;

  cacheService: ICacheService;

  EVMRelayerManagerMap: {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  };

  constructor(
    evmRetryTransactionServiceParams: EVMRetryTransactionServiceParamsType,
  ) {
    const {
      options,
      transactionService,
      networkService,
      retryTransactionQueue,
      cacheService,
    } = evmRetryTransactionServiceParams;
    this.chainId = options.chainId;
    this.EVMRelayerManagerMap = options.EVMRelayerManagerMap;
    this.transactionService = transactionService;
    this.networkService = networkService;
    this.cacheService = cacheService;
    this.queue = retryTransactionQueue;
  }

  onMessageReceived = async (msg?: ConsumeMessage) => {
    if (msg) {
      const transactionDataReceivedFromRetryQueue = JSON.parse(
        msg.content.toString(),
      );

      log.info(
        { chainId: this.chainId, msg: transactionDataReceivedFromRetryQueue },
        "Message received from retry transaction queue",
      );

      try {
        await this.queue.ack(msg);
      } catch (err) {
        log.error(
          { err },
          `EVMRetryTransactionService.onMessageReceived:: Error while acknowledging message`,
        );
      }

      const {
        transactionHash,
        transactionId,
        relayerAddress,
        transactionType,
        relayerManagerName,
      } = transactionDataReceivedFromRetryQueue;

      let account: IEVMAccount;
      if (transactionType === TransactionType.FUNDING) {
        account =
          this.EVMRelayerManagerMap[relayerManagerName][this.chainId]
            .ownerAccountDetails;
      } else {
        account =
          this.EVMRelayerManagerMap[relayerManagerName][this.chainId]
            .relayerMap[relayerAddress];
      }

      const isTransactionMined = await this.cacheService.get(
        getTransactionMinedKey(transactionId),
      );

      if (isTransactionMined === "1") {
        log.info(
          `isTransactionMined: ${isTransactionMined} for transactionHash: ${transactionHash} and transactionId: ${transactionId} on chainId: ${this.chainId} hence not making RPC call to get receipt`,
        );
        await this.cacheService.delete(getTransactionMinedKey(transactionId));
        return;
      }

      log.info(
        `Checking transaction status of transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      let transactionReceipt = null;
      try {
        transactionReceipt =
          await this.networkService.getTransactionReceipt(transactionHash);
        log.info(
          `Transaction receipt for transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${
            this.chainId
          } is ${customJSONStringify(transactionReceipt)}`,
        );
      } catch (error) {
        log.error(
          `Error in fetching transaction receipt from network for transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${
            this.chainId
          } is ${parseError(error)}`,
        );
      }

      if (transactionReceipt) {
        log.info(
          `Transaction receipt receivied for transactionHash: ${transactionHash} and transactionId: ${transactionId} on chainId: ${this.chainId}. Hence not retrying the transaction.`,
        );
      } else {
        log.info(
          `Transaction receipt not receivied for transactionHash: ${transactionHash} and transactionId: ${transactionId} on chainId: ${this.chainId}. Hence retrying the transaction.`,
        );

        if (
          this.networkService.supportsFlashbots &&
          this.networkService.flashbots != null
        ) {
          try {
            const flashbotsStatus =
              await this.networkService.flashbots?.waitForTransaction(
                transactionHash,
              );

            if (flashbotsStatus.status === FlashbotsTxStatus.FAILED) {
              log.error(
                `Flashbots transaction failed for transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
            }
          } catch (error) {
            log.error(
              `Error in fetching flashbots status for transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${
                this.chainId
              } is ${parseError(error)}`,
            );

            return;
          }
        }

        if (!account) {
          log.error(
            `Account not found for transactionHash: ${transactionHash} and transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
        } else {
          await this.transactionService.retryTransaction(
            transactionDataReceivedFromRetryQueue,
            account,
            transactionType,
            relayerManagerName,
          );
        }
      }
    } else {
      log.info(
        `Message not received on retry transaction queue on chainId: ${this.chainId}`,
      );
    }
  };
}
