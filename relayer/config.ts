import { hostname } from 'os';
import { redisClient } from '../common/db';

interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
const config: LooseObject = {};

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

const setupConfig = async () => {
  envConfig.relayerService.nodePathIndex = await getNodePathIndex();
  console.log(`hostname of the server is ${hostname()} using node path index of ${envConfig.relayerService.nodePathIndex}`);
  return 'done';
};

export {
  setupConfig,
  config,
  tracer,
};
