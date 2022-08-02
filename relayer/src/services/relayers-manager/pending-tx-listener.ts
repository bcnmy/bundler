import { redisClient, redisPubSub } from '../../../../common/db/redis';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { getTransactionDataKey } from '../../utils/cache-utils';

const log = logger(module);

export const startPendingTransactionListener = (
  networkId: number,
  retryTransaction: any,
) => {
  try {
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
  } catch (error) {
    log.error(error);
  }
};
