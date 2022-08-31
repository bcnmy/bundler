/* eslint-disable no-await-in-loop */
import { Network } from 'network-sdk';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import { config } from '../../config';
import { logger } from '../../../common/log-config';
import { DaoUtils } from '../dao-utils';
import { Mongo } from '../../../common/db/mongo';
import { RelayerManager } from '../services/relayers-manager';
import { Consumer } from '../services/consumer';
import { TransactionManager } from '../services/transaction-manager/abstract-transaction-manager';

const log = logger(module);
const {
  supportedNetworks, socketService, relayerService,
} = config;

const {
  secret, apiKey, connectionHttp, connectionWs,
} = socketService;

const {
  numberOfRelayersPerNetwork,
} = relayerService;

const relayerManagerMap: Record<number, RelayerManager> = {};

let connection: any;

if (!supportedNetworks) {
  throw new Error('supportedNetworks is undefined');
}
console.log('mongo url ', process.env.MONGO_URL);

const dbInstance = new Mongo(process.env.MONGO_URL || ''); // use the commmon instance
const daoUtilsInstance = new DaoUtils(dbInstance); // use the common instance

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
