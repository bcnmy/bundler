/* eslint-disable import/no-import-module-exports */
import { ConsumeMessage } from 'amqplib';
import { RawTransactionType } from 'network-sdk/dist/types';
import { logger } from '../../../../common/logger';
import { INetworkService } from '../../../../common/network';
import { IQueue } from '../../../../common/queue';
import { RetryTransactionQueueData } from '../../../../common/queue/types';
import { EVMRawTransactionType, TransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';
import { EVMRetryTransactionServiceParamsType } from './types';
import { INotificationManager } from '../../../../common/notification/interface';
import { getAccountUndefinedNotificationMessage } from '../../../../common/notification';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });
export class EVMRetryTransactionService implements
IRetryTransactionService<IEVMAccount, EVMRawTransactionType> {
  transactionService: ITransactionService<IEVMAccount, RawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  chainId: number;

  queue: IQueue<RetryTransactionQueueData>;

  notificationManager: INotificationManager;

  EVMRelayerManagerMap: {
    [name: string] : {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    }
  };

  constructor(evmRetryTransactionServiceParams: EVMRetryTransactionServiceParamsType) {
    const {
      options, transactionService, networkService, retryTransactionQueue, notificationManager,
    } = evmRetryTransactionServiceParams;
    this.chainId = options.chainId;
    this.EVMRelayerManagerMap = options.EVMRelayerManagerMap;
    this.transactionService = transactionService;
    this.networkService = networkService;
    this.notificationManager = notificationManager;
    this.queue = retryTransactionQueue;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      log.info(`Message received from retry transaction queue on chainId: ${this.chainId}: ${JSON.stringify(msg.content.toString())}`);
      this.queue.ack(msg);
      const transactionDataReceivedFromRetryQueue = JSON.parse(msg.content.toString());

      const {
        transactionHash,
        transactionId,
        relayerAddress,
        transactionType,
        relayerManagerName,
      } = transactionDataReceivedFromRetryQueue;

      let account: IEVMAccount;
      if (transactionType === TransactionType.FUNDING) {
        account = this.EVMRelayerManagerMap[relayerManagerName][this.chainId].ownerAccountDetails;
      } else {
        account = this.EVMRelayerManagerMap[relayerManagerName][this.chainId]
          .relayerMap[relayerAddress];
      }

      log.info(`Checking transaction status of transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${this.chainId}`);
      const transactionReceipt = await this.networkService.getTransactionReceipt(transactionHash);
      log.info(`Transaction receipt for transactionHash: ${transactionHash} with transactionId: ${transactionId} on chainId: ${this.chainId} is ${JSON.stringify(transactionReceipt)}`);

      if (transactionReceipt) {
        log.info(`Transaction receipt receivied for transactionHash: ${transactionHash} and tranasctionId: ${transactionId}. Hence not retrying the transaction.`);
      } else {
        log.info(`Transaction receipt not receivied for transactionHash: ${transactionHash} and tranasctionId: ${transactionId}. Hence retrying the transaction.`);

        if (!account) {
          log.error(`Account not found for transactionHash: ${transactionHash} and transactionId: ${transactionId} on chainId: ${this.chainId}`);
          // TODO: send slack notification
          const message = getAccountUndefinedNotificationMessage(
            transactionId,
            relayerAddress,
            transactionType,
            relayerManagerName,
          );
          const slackNotifyObject = this.notificationManager.getSlackNotifyObject(message);
          await this.notificationManager.sendSlackNotification(slackNotifyObject);
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
      log.info(`Message not received on retry transaction queue on chainId: ${this.chainId}`);
    }
  };
}
