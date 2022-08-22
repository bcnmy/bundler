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
      5: 12,
      31: 60,
      42: 60,
      56: 20,
      77: 20,
      97: 100,
      100: 60,
      137: 8,
      1285: 60,
      1287: 60,
      2021: 10,
      8995: 60,
      15001: 60,
      16110: 60,
      43113: 20,
      43114: 20,
      80001: 60,
      421611: 60,
    },
  },
  coinMarketCapApiUrl: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
  coinMarketCapApiKey: process.env.COINMARKETCAP_API_KEY,
  supportedFeeTokens: {
    5: ['ETH', 'USDC', 'USDT', 'WETH'],
    80001: ['MATIC', 'USDC', 'USDT', 'XDAI', 'WETH'],
  },
  wrappedTokens: {
    WETH: 1,
    WMATIC: 137,
  },
  logoUrl: {
    ETH: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png',
    WETH: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png',
    MATIC: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png',
    WMATIC: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png',
    USDC: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png',
    USDT: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
    XDAI: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/xdai.png',
  },
  similarTokens: {
    1: ['ETH', 'WETH'],
    5: ['ETH', 'WETH'],
    137: ['MATIC', 'WMATIC'],
    80001: ['MATIC', 'WMATIC'],
  },
  offset: {
    USDC: 1000000,
    USDT: 1000000,
    WETH: 1,
    XDAI: 1,
    MATIC: 1,
  },
  tokenContractAddress: {
    5: {
      ETH: '0X',
      USDC: '0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb',
      USDT: '0xb1f79Eb4fb3BD4DD516033FA9ab3037874A905E4',
      WETH: '0xb7e94Cce902E34e618A23Cb82432B95d03096146',
    },
    80001: {
      MATIC: '0X',
      USDC: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747',
      USDT: '0x51261AA98e932737a8F159B15d246d32978EB42e',
      WETH: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      XDAI: '0xf61cBcaC6C5E4F27543495890536B799D18f7178',
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
