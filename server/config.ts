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
    80001: 'https://polygon-mumbai.g.alchemy.com/v2/OcZ3-nUEz5Pnk-y0FzLikmD6Ky_ompOf',
    43113: 'https://api.avax-test.network/ext/bc/C/rpc',
    4002: 'https://rpc.testnet.fantom.network',
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
      ETH: '0X',
      USDC: '0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF',
      USDT: '0xb1f79Eb4fb3BD4DD516033FA9ab3037874A905E4',
      WETH: '0xb7e94Cce902E34e618A23Cb82432B95d03096146',
      DAI: '0xE68104D83e647b7c1C15a91a8D8aAD21a51B3B3E',
    },
    80001: {
      MATIC: '0X',
      USDC: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747',
      USDT: '0x51261AA98e932737a8F159B15d246d32978EB42e',
      WETH: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      DAI: '0xf61cBcaC6C5E4F27543495890536B799D18f7178',
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
  },
  ccmp: {
    wormholeHostURL: "https://wormhole-v2-testnet-api.certus.one",
    contracts: {
      43113: {
        // CCMPExecutor: 0x44109379c9cDd04f8afE3FeA161b236BE7DbF280,
        // AxelarAdaptor: 0x5f26dF88f7C9522044940cA257e57b9dD6072857,
        // WormholeAdaptor: 0x3325639d0058D76319b692009CC9760C16A4C74d,
        // CCMPConfigurationFacet: 0xDdB0DECA91b45024586Dbe33ef3FFC0749B055Ee,
        // CCMPReceiverMessageFacet: 0x49B4727A2591B1F34c4775c883500960D1eC06b1,
        // CCMPSendMessageFacet: 0xB552525317019cA54787dC20022C46AA237c8453,
        // DiamondCutFacet: 0x3A86d5199d70C2f1b7d1732Aa50B7C4d22Fb05F3,
        // DiamondLoupeFacet: 0x52c57ED21Dc38d2b6466FD94E0323A6bA0976d0C,
        // DiamondInit: 0x81f2e6e46596240038E047698808B8Ea2CE04475,
        // Diamond: 0xA816251826202799399Dbdcf42BFd5533A9b251b,
        // sampleContract: 0xA8F406E049A6b09a69559C5e76A3FfE6DB6f8092
        CCMPExecutor: 0x78d084b6BfEB90Ac787a163e03F7dcE9B2fA9274,
        AxelarAdaptor: 0x92E5b8Cb7D21DfB4F7a84610eD9271e0b207D8b8,
        WormholeAdaptor: 0x9Bb1239A3719Ccc5e0C551f0B16954737601F787,
        AbacusAdaptor: 0x89A4920D12e3B59372E9841171Cb7BD4B2d8ee1A,
        CCMPConfigurationFacet: 0x97FcFfeA99b8C2ac576f55a028dCCBCF3E81481d,
        CCMPReceiverMessageFacet: 0xd45C146C20E2d1B91D5Ca5366f5B56b55f9657D6,
        CCMPSendMessageFacet: 0xB5927ae01De192aCB5b3273FC801d863Cdb7C597,
        DiamondCutFacet: 0x8E6C143d37fEbD2EDCc3fa068B537Cfd6B63fD17,
        DiamondLoupeFacet: 0x4da0f1fF68D2E265C630b604bEFD1De24953a5Ea,
        DiamondInit: 0xf5C88dBAAD38A3c4C989De86d62c0da8513C3994,
        Diamond: 0x70983C70985DeeEfA5249583ea569AfAAeD3a852,
        sampleContract: 0x7eC42390fce75a98C087Bf2eA3690EBD375b1c19
      },
      // 97: {
      //   CCMPExecutor: 0x11963cc8D9c219c1Cf0ed7B3ca9aEaa5bc1C2AB2,
      //   AxelarAdaptor: 0x7e450CF19983B4c7B9c5C3eE6877c233e0Ac5E0C,
      //   WormholeAdaptor: 0xe1B63E22ecdf97C7F9762BFDefcd15d9e6a94Bbc,
      //   CCMPConfigurationFacet: 0x7c97117050E72144e841231Bb3571853a017e902,
      //   CCMPReceiverMessageFacet: 0xf04919da5a392edc3F232B90D0e0E6847f3BB9E1,
      //   CCMPSendMessageFacet: 0xA60940529b73d0fC21F715026EAF3845a6DAd6E7,
      //   DiamondCutFacet: 0x754C4bd5c286DA154394cf15a7fd0029E6966230,
      //   DiamondLoupeFacet: 0x1Bf151EE87D5701DC14Ee29200f6b45AA06b7C9F,
      //   DiamondInit: 0xd2ed4A4B7827C6EF0640c4826A43C467F9504e83,
      //   Diamond: 0xa1438079404C96a2D2e7155df2322134a608fa11,
      //   sampleContract: 0xe1532e0014a9bB08F043E86Ac057895444912136
      // }
      80001: {
        CCMPExecutor: 0x69d1Db7de106D39811cb8cC7FFFE541C76582602,
        AxelarAdaptor: 0x8a90b071dDa1F4dD3a8b13ac6a81d119a22f501B,
        WormholeAdaptor: 0xef0286B6d77730941186F26D76282f95A36d008c,
        AbacusAdaptor: 0xb196e62a6354d7658E599B86637f2acbE3d2f243,
        CCMPConfigurationFacet: 0x4937287EEf3dcC7C28D87d2C33895E68cA49c0B5,
        CCMPReceiverMessageFacet: 0xe811f4878d4Cc16Cb681d23053Cc23425637Bb1e,
        CCMPSendMessageFacet: 0x9673b6737cfFeAd1ddE52FA05D832674cC7256f5,
        DiamondCutFacet: 0x02076044497847f8CeE3025F617D2C035eefcf2B,
        DiamondLoupeFacet: 0x13fc8DCAae746d90006410F64dd3D8cBC46c2Ef8,
        DiamondInit: 0x33BBBe77d01055e3Ea33A04178a6c64267329146,
        Diamond: 0x7210Ce17B2e8731398A9c1D728d16f08d7A9d311,
        sampleContract: 0xa8139ABCcd7D6c8b9d74e36851f1D33e78aFca21
      }
    }
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
