/* eslint-disable max-len */
// setup channel for consuming data from queue
// 1-1 mapping with relayer
// consumer(transactionmanager(relayer))

import amqp from 'amqplib/callback_api';
import { TransactionType } from '../../common/types';
import { IConsumer } from './interface';

export class Consumer implements IConsumer {
  chainId: number;

  transactionType: TransactionType;

  constructor(chainId: number, transactionType: TransactionType) {
    this.chainId = chainId;
    this.transactionType = TransactionType[transactionType];
  }

  async connectToQueue(queueUrl: string) {
    // connect to rabbit mq
    amqp.connect(queueUrl, async (err, conn) => {
      // call consumptionFromQueue();
      // call fetchRelayerFromRelayerManager & sendTransactionToTransactionManager inside consumptionFromQueue();
    });
  }

  async fetchRelayerFromRelayerManager(chainId: number, transactionType: string): Promise<IRelayer> {
    const relayerManager = relayerManagerMap[chainId][transactionType];
    const activeRelayer = await relayerManager.getActiveRelayer();
    return activeRelayer;
  }

  async sendTransactionToTransactionManager(relayer: IRelayer, transactionData: ITransactionData): Promise<TransactionResponse> {
    const transactionResponse = await transactionManager.executeTransaction(relayer, transactionData);
    // Error handling for each case, 417, 500 etc etc
  }

  async listenForPendingTransaction() {
    redisPubSub.pSubscribe(
      config.relayerService.EVENT_EXPIRED_STRING,
      async (event: string, key: string) => {
        if (event === 'expired') {
          log.info(`[i] expired event on ${key} triggered. calling retry service`);
          const transactionId = key.split(':')[1].split('_')[1];
          const stransactionData = await redisClient.get(getTransactionDataKey(transactionId)) || '';
          if (stransactionData) {
            const transactionData = JSON.parse(stransactionData);
            if (networkId === transactionData.chainId) {
              await retryTransaction(transactionId, transactionData);
            }
          }
        }
      },
    );
  }
}
