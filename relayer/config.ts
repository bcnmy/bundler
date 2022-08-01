import { hostname } from 'os';
import { diff } from 'deep-object-diff';
import _ from 'lodash';
import { redisClient, redisPubSub } from './src/db';
import { getRelayerServiceConfiguration } from './src/utils/cache-utils';
import { init } from './src/utils/tracing';

const { tracer } = init('relayers-service');

interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
let config: LooseObject = {};

const getNodePathIndex = async () => {
  const r = await redisClient.get('NODE_PATH_INDEX');
  const nodePathIndex = JSON.parse(r || '{}');
  const hostName = hostname();
  const index = parseInt(hostName.split('-')[2] || '0', 10);
  nodePathIndex[hostName] = index;
  await redisClient.set('NODE_PATH_INDEX', JSON.stringify(nodePathIndex));
  return index;
};

const envConfig: LooseObject = {
  mongoUrl: process.env.MONGO_URL,
  slack: {
    token: process.env.SLACK_TOKEN,
  },
  socketService: {
    connectionHttp: process.env.WEB_SOCKET_API_URL,
    connectionWs: process.env.WEB_SOCKET_URL,
    secret: process.env.HMAC_SECRET_KEY,
    apiKey: process.env.CF_API_KEY,
  },
  relayerService: {
    EVENT_EXPIRED_STRING: `__keyspace@*__:TxId_*_${hostname()}`,
    RESUBMIT_EXPIRED_STRING: `__keyspace@*__:ResubmitTxId_*_*_${hostname()}`,
    ETH_ACCOUNT_PASS: process.env.ETH_ACCOUNT_PASS,
    queueUrl: process.env.RELAYER_QUEUE_URL,
    queueExchange: process.env.RELAYER_QUEUE_EXCHANGE,
    masterSeed: process.env.RELAYERS_MASTER_SEED,
  },
};

let supportedNetworks = process.env.SUPPORTED_NETWORKS;

try {
  if (supportedNetworks) {
    supportedNetworks = JSON.parse(supportedNetworks);
  }
} catch (error) {
  throw new Error('Supported networks array not found in process env');
}

envConfig.supportedNetworks = supportedNetworks;

let eip1559SupportedNetworks = process.env.EIP1559_SUPPORTED_NETWORKS;

try {
  if (eip1559SupportedNetworks) {
    eip1559SupportedNetworks = JSON.parse(eip1559SupportedNetworks);
  }
} catch (error) {
  throw new Error('Supported networks array not found in process env');
}

envConfig.eip1559SupportedNetworks = eip1559SupportedNetworks;

// parameter that can change in config
// TODO: relayerFundingAmount, relayerMinimumBalanceThreshold,
// txnHashKeyExpiryTimePerNetwork, autoCreatedRelayersLengthPerNetwork, provider

export const configChangeListeners: any = {
  relayerManagerService: [],
};

const parseConfiguration = (configuration: string) => {
  try {
    const o = JSON.parse(configuration);
    if (o && typeof o === 'object') {
      return o;
    }
  } catch (error) {
    console.log('invalid json');
  }
  return false;
};

const setupConfig = async () => {
  const staticConfig = await redisClient.get(getRelayerServiceConfiguration()) || '';
  envConfig.relayerService.nodePathIndex = await getNodePathIndex();
  console.log(`hostname of the server is ${hostname()} using node path index of ${envConfig.relayerService.nodePathIndex}`);

  config = _.merge(envConfig, JSON.parse(staticConfig));
  await redisPubSub.subscribe('configuration_relayer_service', (message, channel) => {
    const c = parseConfiguration(message);
    if (c) {
      console.log(channel, message);
      const diffConfig = diff(config, JSON.parse(message));
      for (const confKey of Object.keys(diffConfig)) {
        if (configChangeListeners[confKey]) {
          for (const listener of configChangeListeners[confKey]) {
            listener(JSON.parse(message));
          }
        }
      }
    }
  });
  return 'done';
};

export {
  setupConfig,
  config,
  tracer,
};
