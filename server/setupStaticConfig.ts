const { createClient } = require('redis');

const REDIS_CONN_URL = 'redis://127.0.0.1:6379';

const redisClient = createClient({
  url: REDIS_CONN_URL,
});
const config = {
  provider: {
    77: 'https://sokol.poa.network',
    100: 'https://old-crimson-silence.xdai.quiknode.pro/54b6dfe2b18b52cd8cea8bc8807e4448d0332bc5/',
    3: 'https://ropsten.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19',
    42: 'https://eth-kovan.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y',
    5: 'https://goerli.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19c',
    4: 'https://rinkeby.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19c',
    1: 'https://eth-mainnet.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y',
    80001: 'https://polygon-mumbai.infura.io/v3/113843749d494bc39ff60007ac6d121d',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/s6bOKN9QDGXpVbsqzJMl_AHeZHNOCTcM',
    43113: 'https://api.avax-test.network/ext/bc/C/rpc',
    43114: 'https://api.avax.network/ext/bc/C/rpc',
    97: 'https://data-seed-prebsc-2-s3.binance.org:8545/',
    1287: 'https://moonbeam-alpha.api.onfinality.io/rpc?apikey=833584bb-127a-4134-bec7-7bd41af5130a',
    2021: 'https://mainnet.edgewa.re/evm',
    421611: 'https://arbitrum-rinkeby.infura.io/v3/113843749d494bc39ff60007ac6d121d',
    42161: 'https://arbitrum-mainnet.infura.io/v3/113843749d494bc39ff60007ac6d121d',
    1285: 'https://moonriver.api.onfinality.io/rpc?apikey=833584bb-127a-4134-bec7-7bd41af5130a',
    1284: 'https://moonbeam.api.onfinality.io/public',
    250: 'https://apis.ankr.com/b0b9051eea794ecfafac081a2930957c/7c06eca67a94c3bc9d466a5f1ca366d3/fantom/full/main',
    4002: 'https://apis.ankr.com/6b774dee28d04084972d2dae89971495/7c06eca67a94c3bc9d466a5f1ca366d3/fantom/full/test',
  },
};
redisClient.connect().then(() => {
  redisClient.set('META_ENTRY_CONFIGURATION', JSON.stringify(config));
  console.log('done');
}).finally(() => {
  process.exit(1);
});
