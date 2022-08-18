import { Network } from 'network-sdk';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import amqp from 'amqplib/callback_api';
import { config } from '../../config';
import { logger } from '../../../common/log-config';
import { DaoUtils } from '../dao-utils';
import { Mongo } from '../../../common/db/mongo';
import { RelayerManager } from '../services/relayers-manager';
import { GasPrice } from '../../../common/gas-price';

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

const dbInstance = new Mongo(process.env.MONGO_URL || '');
const daoUtilsInstance = new DaoUtils(dbInstance);

export const init = async () => {
  const { queueUrl } = config.relayerService;
  amqp.connect(queueUrl, async (err, conn) => {
    console.log('[AMQP] connected');
    connection = conn;

    dbInstance.connect();

    const relayerManagerMessenger = new RelayerManagerMessenger(
      connectionWs,
      connectionHttp,
      secret,
      apiKey,
    );

    // try {
    //   await relayerManagerMessenger.connect();
    // } catch (error) {
    //   log.error(error);
    // }

    for (const networkId of supportedNetworks) {
      log.info(`Creating new Network instance for network id ${networkId}`);
      log.info(`Creating new Meta Transaction Handler instance for network id ${networkId}`);

      const rpcURL: string = config.provider[networkId];
      // Create new instance of Network SDK for all supported networks
      const network: Network = new Network(rpcURL);
      // this should be loaded from .env
      relayerManagerMap[networkId] = new RelayerManager(
        network,
        networkId,
        relayerManagerMessenger,
        connection,
        daoUtilsInstance,
      );
      log.info(`Setting up ${numberOfRelayersPerNetwork[networkId]} relayer for network id ${networkId}`);

      relayerManagerMap[networkId].createRelayers(numberOfRelayersPerNetwork[networkId]);

      // gasPriceMap[networkId] = new GasPrice(networkId, network);
      // gasPriceMap[networkId].scheduleForUpdate(gasPriceService.updateFrequencyInSecond);
    }
  });
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
