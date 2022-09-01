import { Queue } from '../../../../common/queue';
import { IConsumer } from './interface';

export class Consumer implements IConsumer {
  private chainId: number;

  transactionType: string;

  constructor(chainId: number, transactionType: string) {
    this.chainId = chainId;
    this.transactionType = transactionType;
  }

  async connectToQueue() {
    const queue = new Queue(this.chainId, this.transactionType);
    await queue.setupConsumerInRelayer();
    await queue.consumeInRelayer();
  }

  async fetchRelayerFromRelayerManager(): Promise<IRelayer> {
    const relayerManager = relayerManagerMap[this.chainId][this.transactionType];
    const activeRelayer = await relayerManager.getActiveRelayer();
    return activeRelayer;
  }

  async sendTransactionToTransactionManager(transactionData: ITransactionData)
    : Promise<TransactionResponse> {
    const relayer = await this.fetchRelayerFromRelayerManager();
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
