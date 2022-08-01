import { hostname } from 'os';
import { config } from '../../../config';
import { logger } from '../../../log-config';
import { redisPubSub } from '../../db/redis';
import { daoUtilsInstance, relayerManagerMap } from '../../service-manager';

const log = logger(module);

redisPubSub.pSubscribe(config.relayerService.RESUBMIT_EXPIRED_STRING, async (event, key) => {
  const transactionId = key.split(':')[1].split('_')[1];
  const networkId = parseInt(key.split(':')[1].split('_')[2], 10);
  const requestHostname = key.split(':')[1].split('_')[3];
  log.info(`resubmitting transaction id ${transactionId} of network id ${networkId} with hostname ${hostname}`);
  if (event === 'expired' && hostname() === requestHostname) {
    const transactoinDataFromDB: any = await daoUtilsInstance.getTransaction({
      transactionId,
    }, networkId);
    if (networkId === transactoinDataFromDB.chainId) {
      await relayerManagerMap[networkId].retryTransaction(transactionId, transactoinDataFromDB);
    }
  }
});
