interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
let config: LooseObject = {};

const envConfig: LooseObject = {
  supportedNetworks: process.env.SUPPORTED_NETWORKS,
  erc20TokenGasPriceInterval: process.env.ERC20_TOKEN_GAS_PRICE_INTERVAL,
  networkSymbolsCategories: {
    ETH: [1, 5, 4],
    MATIC: [80001, 137],
  },
  provider: {
    5: 'https://goerli.infura.io/v3/30125eccc47e475b9a9421f0eaf1e19c',
    80001: 'https://polygon-mumbai.infura.io/v3/113843749d494bc39ff60007ac6d121d',
  },
  currency: {
    8995: 'MATIC',
    80001: 'MATIC',
    137: 'MATIC',
    3: 'ETH',
    4: 'ETH',
    5: 'ETH',
    16110: 'MATIC',
    5777: 'DEV',
    15001: 'MATIC',
    42: 'ETH',
    1512051714758: 'DEV',
    1: 'ETH',
    77: 'SPOA',
    100: 'XDAI',
    31: 'RBTC',
    43113: 'AVAX',
    43114: 'AVAX',
    97: 'BNB',
    1287: 'GLMR',
    1284: 'GLMR',
    56: 'BNB',
    2021: 'EDG',
    421611: 'ETH',
    42161: 'AETH',
    1285: 'MOVR',
    250: 'FTM',
    4002: 'FTM',
  },
  decimal: {
    8995: 18,
    80001: 18,
    137: 18,
    3: 18,
    4: 18,
    5: 18,
    16110: 18,
    15001: 18,
    42: 18,
    1: 18,
    77: 18,
    100: 18,
    31: 8,
    43113: 18,
    43114: 18,
    97: 18,
    1287: 18,
    1284: 18,
    56: 18,
    2021: 18,
    421611: 18,
    42161: 18,
    1285: 18,
    250: 18,
    4002: 18,
  },
  gasPriceService: {
    updateFrequencyInSecond: {
      0: 600, // default
      1: 12,
      3: 12,
      4: 12,
      5: 300,
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
  coinMarketCapApiUrl: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
  coinMarketCapApiKey: process.env.COINMARKETCAP_API_KEY,
  supportedFeeTokens: {
    5: ['USDC', 'USDT', 'WETH'],
    80001: ['USDC', 'USDT', 'WETH'],
  },
  tokenContractAddress: {
    5: {
      USDC: '0x',
      USDT: '0x',
      WETH: '0x',
    },
    80001: {
      USDC: '0x',
      USDT: '0x',
      WETH: '0x',
    },
  },
  // 1 - multiply, 0 - nothing, 2 - convert
  networkPriceMap: {
    5: {
      USDC: 1,
      USDT: 1,
      WETH: 0,
    },
    80001: {
      USDC: 1,
      USDT: 1,
      WETH: 2,
    },
  },
};

const setupConfig = async () => {
  config = envConfig;
  return 'done';
};

export {
  config,
  setupConfig,
};
