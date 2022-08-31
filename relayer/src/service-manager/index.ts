/* eslint-disable no-await-in-loop */
import { logger } from '../../../common/log-config';
import { config } from '../../config';
import { Consumer } from '../services/consumer';
import { RelayerManager } from '../services/relayers-manager';
import { TransactionManager } from '../services/transaction-manager/transaction-manager';

const log = logger(module);


const relayerManagerMap: Record<number, RelayerManager> = {};
// make instance of consumer 
// make instance of relayer manager
// make instance of transaction manager

export const init = async () => {
  /* queueUrlOfTransactionType = {
    'SCW': 'https://rabbit-mq-scw',
    'AA': 'https://rabbit-mq-aa'
  } */
  const supportedTransactionTypeForNetworks = {
    80001: ['AA', 'SCW'],
    137: ['CROSS_CHAIN'],
  };
  const { queueUrlOfTransactionType } = config;
  for (const networkId of supportedNetworks) {
    for (const transactionType of supportedTransactionTypeForNetworks[networkId]) {
      const consumer = new Consumer(networkId, transactionType);

      await consumer.connectToQueue(queueUrlOfTransactionType[transactionType]);

      relayerManagerMap[networkId][transactionType] = new RelayerManager();
    }
  }
  const transactionManager = new TransactionManager();
};

process.on('SIGTERM', async () => {
  console.log('The service is about to shut down!');
  const networks = Object.keys(relayerManagerMap);
  const p = [];
  for (const network of networks) {
    const n = parseInt(network, 10);
    p.push(relayerManagerMap[n].stopServer());
  }
  await Promise.all(p);
  process.exit(1);
});

export {
  relayerManagerMap,
  daoUtilsInstance,
};
