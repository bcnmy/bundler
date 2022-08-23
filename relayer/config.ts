import _ from 'lodash';
import { hostname } from 'os';

interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
let config: LooseObject = {};

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
    nodePathIndex: process.env.NODE_PATH_INDEX,
    queueUrl: process.env.RELAYER_QUEUE_URL,
    queueExchange: process.env.RELAYER_QUEUE_EXCHANGE,
    masterSeed: process.env.RELAYERS_MASTER_SEED,
  },
  gasPriceService: {
    updateFrequencyInSecond: {
      0: 600, // default
      1: 12,
      3: 12,
      4: 12,
      5: 12,
      31: 600,
      42: 600,
      56: 20,
      77: 20,
      97: 100,
      100: 600,
      137: 8,
      1285: 600,
      1287: 600,
      2021: 100,
      8995: 600,
      15001: 600,
      16110: 600,
      43113: 200,
      43114: 200,
      80001: 600,
      421611: 600,
    },
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

const redisConfig = '{"bumpGasPrice":{"1":25,"3":50,"4":40,"5":50,"31":50,"42":50,"56":50,"77":50,"97":50,"100":50,"137":35,"1285":35,"1287":40,"2021":40,"8995":50,"15001":50,"16110":50,"43113":35,"43114":35,"80001":50,"421611":25},"slack":{"channel":"C02HRFB2T17"},"provider":{"1":"https://eth-mainnet.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y","3":"https://ropsten.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19","4":"https://rinkeby.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19c","5":"https://eth-goerli.g.alchemy.com/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y","42":"https://eth-kovan.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y","56":"https://purple-green-cherry.bsc.quiknode.pro/undefined/","77":"https://sokol.poa.network","97":"https://data-seed-prebsc-2-s3.binance.org:8545/","100":"https://old-crimson-silence.xdai.quiknode.pro/54b6dfe2b18b52cd8cea8bc8807e4448d0332bc5/","137":"https://polygon-mainnet.g.alchemy.com/v2/s6bOKN9QDGXpVbsqzJMl_AHeZHNOCTcM","250":"https://apis.ankr.com/b0b9051eea794ecfafac081a2930957c/7c06eca67a94c3bc9d466a5f1ca366d3/fantom/full/main","1284":"https://moonbeam.api.onfinality.io/public","1285":"https://moonriver.api.onfinality.io/rpc?apikey=833584bb-127a-4134-bec7-7bd41af5130a","1287":"https://moonbeam-alpha.api.onfinality.io/rpc?apikey=833584bb-127a-4134-bec7-7bd41af5130a","2021":"https://mainnet.edgewa.re/evm","4002":"https://apis.ankr.com/6b774dee28d04084972d2dae89971495/7c06eca67a94c3bc9d466a5f1ca366d3/fantom/full/test","42161":"https://arbitrum-mainnet.infura.io/v3/113843749d494bc39ff60007ac6d121d","43113":"https://api.avax-test.network/ext/bc/C/rpc","43114":"https://api.avax.network/ext/bc/C/rpc","80001":"https://polygon-mumbai.g.alchemy.com/v2/OcZ3-nUEz5Pnk-y0FzLikmD6Ky_ompOf","421611":"https://arbitrum-rinkeby.infura.io/v3/113843749d494bc39ff60007ac6d121d"},"relayerService":{"gasLimit":{"0":210000,"1":710000},"networkResponseCodes":{"errors":{"ALREADY_KNOWN":"already known","REPLACEMENT_UNDERPRICED":"REPLACEMENT_UNDERPRICED","INSUFFICIENT_FUNDS":"insufficient funds for gas","INVALID_TRANSACTION":"submit transaction to pool failed"}},"networksNonceError":{"1":"nonce too low","3":"nonce too low","4":"nonce too low","5":"nonce too low","42":"nonce is too low","56":"nonce too low","77":"nonce is too low","97":"nonce too low","100":"nonce is too low","137":"nonce too low","250":"nonce too low","1284":"InvalidTransaction::Stale","1285":"InvalidTransaction::Stale","1287":"InvalidTransaction::Stale","2021":"InvalidTransaction::Stale","4002":"nonce too low","8995":"nonce too low","15001":"nonce too low","16110":"nonce too low","42161":"invalid transaction nonce","43113":"nonce too low","43114":"nonce too low","80001":"nonce too low","421611":"invalid transaction nonce"},"networksInsufficientFundsError":{"1":"insufficient funds for gas","3":"insufficient funds for gas","4":"insufficient funds for gas","5":"insufficient funds for gas","42":"insufficient funds for gas","56":"insufficient funds for gas","77":"insufficient funds for gas","97":"insufficient funds for gas","100":"insufficient funds for gas","137":"insufficient funds for gas","250":"insufficient funds for intrinsic transaction","1284":"insufficient funds for gas","1285":"insufficient funds for gas","1287":"insufficient funds for gas","2021":"insufficient funds for gas","4002":"insufficient funds for intrinsic transaction","8995":"insufficient funds for gas","15001":"insufficient funds for gas","16110":"insufficient funds for gas","42161":"not enough funds for gas","43113":"insufficient funds for gas","43114":"insufficient funds for gas","80001":"insufficient funds for gas","421611":"not enough funds for gas"},"relayerMinimumBalanceThreshold":{"1":0.5,"3":0.1,"4":0.1,"5":0.005,"31":0.1,"42":0.04,"56":0.25,"77":0.5,"97":0.25,"100":2,"137":7,"1285":0.1,"1287":0.1,"2021":0.5,"8995":0.1,"15001":0.1,"16110":0.1,"43113":0.1,"43114":0.1,"80001":0.05,"421611":0.1,"212984383488152":0.2},"txnHashKeyExpiryTimePerNetwork":{"1":540,"3":180,"4":180,"5":746,"42":480,"56":134,"97":134,"100":224,"137":140,"1287":540,"2021":480,"43113":480,"43114":480,"80001":115,"421611":60},"relayerFundingAmount":{"1":0.04,"3":0.02,"4":0.07,"5":0.1,"31":0.05,"42":0.02,"56":0.02,"77":0.03,"97":0.5,"100":0.04,"137":0.2,"1287":0.02,"2021":0.02,"4002":1,"8995":0.02,"15001":0.02,"16110":0.02,"43113":0.5,"43114":0.1,"80001":0.1},"numberOfRelayersPerNetwork":{"1":3,"3":3,"4":2,"5":2,"42":5,"56":3,"97":5,"100":5,"137":3,"1287":1,"2021":1,"4002":3,"8995":1,"43113":3,"43114":2,"80001":2},"maxRelayerQueueSizePerNetwork":{"1":5,"3":5,"4":3,"5":10,"42":90,"56":5,"97":7,"100":8,"137":3,"1287":2,"2021":2,"4002":5,"8995":2,"43113":5,"43114":3,"80001":50},"autoCreatedRelayersLengthPerNetwork":{"1":2,"3":2,"4":1,"5":2,"42":26,"56":2,"97":2,"100":3,"137":2,"1287":1,"2021":1,"4002":2,"8995":1,"43113":2,"43114":1,"80001":18}},"currency":{"1":"ETH","3":"ETH","4":"ETH","5":"ETH","31":"RBTC","42":"ETH","56":"BNB","77":"SPOA","97":"BNB","100":"XDAI","137":"MATIC","250":"FTM","1284":"GLMR","1285":"MOVR","1287":"GLMR","2021":"EDG","4002":"FTM","5777":"DEV","8995":"MATIC","15001":"MATIC","16110":"MATIC","42161":"AETH","43113":"AVAX","43114":"AVAX","80001":"MATIC","421611":"ETH","1512051714758":"DEV"},"decimal":{"1":18,"3":18,"4":18,"5":18,"31":8,"42":18,"56":18,"77":18,"97":18,"100":18,"137":18,"250":18,"1284":18,"1285":18,"1287":18,"2021":18,"4002":18,"8995":18,"15001":18,"16110":18,"42161":18,"43113":18,"43114":18,"80001":18,"421611":18},"fiatCurrency":"USD","NODE_PATH_INDEX":"{}"}';

const setupConfig = async () => {
  config = _.merge(envConfig, JSON.parse(redisConfig));
  console.log(`hostname of the server is ${hostname()} using node path index of ${envConfig.relayerService.nodePathIndex}`);
  return 'done';
};

export {
  setupConfig,
  config,
};
