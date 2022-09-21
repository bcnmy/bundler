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
    5: 'https://eth-goerli.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y',
    80001: 'https://polygon-mumbai.g.alchemy.com/v2/OcZ3-nUEz5Pnk-y0FzLikmD6Ky_ompOf',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/s6bOKN9QDGXpVbsqzJMl_AHeZHNOCTcM',
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
    100: 'DAI',
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
    5: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    80001: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'],
    137: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'],
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
    DAI: 1,
    MATIC: 1,
  },
  tokenContractAddress: {
    5: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF',
      USDT: '0x64Ef393b6846114Bad71E2cB2ccc3e10736b5716',
      WETH: '0xb7e94Cce902E34e618A23Cb82432B95d03096146',
      DAI: '0xE68104D83e647b7c1C15a91a8D8aAD21a51B3B3E',
    },
    80001: {
      MATIC: '0x0000000000000000000000000000000000000000',
      USDC: '0xdA5289fCAAF71d52a80A254da614a192b693e977',
      USDT: '0xeaBc4b91d9375796AA4F69cC764A4aB509080A58',
      WETH: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      DAI: '0xf61cBcaC6C5E4F27543495890536B799D18f7178',
    },
    137: {
      MATIC: '0x0000000000000000000000000000000000000000',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    },
  },
  decimalTokens: {
    5: {
      ETH: 18,
      USDC: 6,
      USDT: 18,
      WETH: 18,
      DAI: 18,
    },
    80001: {
      MATIC: 18,
      USDC: 6,
      USDT: 18,
      WETH: 18,
      DAI: 18,
    },
    137: {
      MATIC: 18,
      USDC: 6,
      USDT: 18,
      WETH: 18,
      DAI: 18,
    },
  },
  feeTokenTransferGas: {
    5: {
      ETH: 7300,
      USDC: 22975,
      USDT: 22975,
      WETH: 22975,
      DAI: 22975,
    },
    80001: {
      MATIC: 21000,
      USDC: 21000,
      USDT: 21000,
      WETH: 21000,
      DAI: 21000,
    },
    137: {
      MATIC: 21000,
      USDC: 21000,
      USDT: 21000,
      WETH: 21000,
      DAI: 21000,
    },
  },
  refundReceiver: {
    5: {
      ETH: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDC: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDT: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      WETH: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      DAI: '0xC1D3206324D806b6586cf15324178f8E8781A293',
    },
    80001: {
      MATIC: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDC: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDT: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      WETH: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      DAI: '0xC1D3206324D806b6586cf15324178f8E8781A293',
    },
    137: {
      MATIC: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDC: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      USDT: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      WETH: '0xC1D3206324D806b6586cf15324178f8E8781A293',
      DAI: '0xC1D3206324D806b6586cf15324178f8E8781A293',
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
