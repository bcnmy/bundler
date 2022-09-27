import _ from 'lodash';

import { IConfig, ConfigType } from './interface/IConfig';
import { TransactionType } from '../common/types';

class Config implements IConfig {
  config: ConfigType;

  constructor(config: ConfigType) {
    this.config = config;
  }

  update(data: object): boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): ConfigType {
    return this.config;
  }
}

const data: ConfigType = {
  slack: {
    token: '',
    channel: '1BQKZLQ0Y',
  },
  dataSources: {
    mongoUrl: '',
    redisUrl: '',
  },
  socketService: {
    wssUrl: '',
    httpUrl: '',
    secret: '',
    apiKey: '',
  },
  supportedNetworks: [5, 137, 80001],
  supportedTransactionType: {
    5: [TransactionType.AA, TransactionType.SCW],
    137: [TransactionType.AA, TransactionType.SCW],
    80001: [TransactionType.AA, TransactionType.SCW],
  },
  chains: {
    currency: {
      5: 'ETH',
      137: 'MATIC',
      80001: 'MATIC',
    },
    decimal: {
      5: 18,
      137: 18,
      80001: 18,
    },
    provider: {
      5: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      137: 'https://rpc-mainnet.maticvigil.com',
      80001: 'https://rpc-mumbai.maticvigil.com',
    },
    ownerAccountDetails: {
      5: {
        publicKey: '',
        privateKey: '',
      },
      137: {
        publicKey: '',
        privateKey: '',
      },
      80001: {
        publicKey: '',
        privateKey: '',
      },
    },
  },
  relayer: {
    nodePathIndex: 0,
  },
  relayerManager: [
    {
      name: 'relayer1',
      gasLimitMap: {
        0: 1000000,
        1: 1000000,
      },
      minRelayerCount: {
        5: 3,
        137: 3,
        80001: 3,
      },
      maxRelayerCount: {
        5: 5,
        137: 5,
        80001: 5,
      },
      inactiveRelayerCountThreshold: {
        5: 2,
        137: 2,
        80001: 2,
      },
      pendingTransactionCountThreshold: {
        5: 15,
        137: 15,
        80001: 15,
      },
      fundingRelayerAmount: {
        5: 0.1,
        137: 0.1,
        80001: 0.1,
      },
      newRelayerInstanceCount: {
        5: 1,
        137: 1,
        80001: 1,
      },
    },
  ],
  transaction: {
    errors: {
      networkResponseCodes: {
        5: '0x5',
        137: '0x5',
        80001: '0x5',
      },
      networksNonceError: {
        5: '0x6',
        137: '0x6',
        80001: '0x6',
      },
      networksInsufficientFundsError: {
        5: '0x3',
        137: '0x3',
        80001: '0x3',
      },
    },
  },
  gasPrice: {
    5: {
      updateFrequencyInSeconds: 60,
      minGasPrice: 1000000000,
      maxGasPrice: 10000000000,
      baseFeeMultiplier: 1.1,
      gasOracle: {
        ethGasStation: 'https://ethgasstation.info/json/ethgasAPI.json',
      },
    },
    137: {
      updateFrequencyInSeconds: 60,
      minGasPrice: 1000000000,
      maxGasPrice: 10000000000,
      baseFeeMultiplier: 1.1,
      gasOracle: {
        maticGasStation: 'https://gasstation-mainnet.matic.network',
      },
    },
    80001: {
      updateFrequencyInSeconds: 60,
      minGasPrice: 1000000000,
      maxGasPrice: 10000000000,
      baseFeeMultiplier: 1.1,
      gasOracle: {
        maticGasStation: 'https://gasstation-mumbai.matic.today',
      },
    },
  },
  feeOption: {
    supportedFeeTokens: {
      5: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
      80001: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'],
      137: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'],
    },
    offset: {
      USDC: 1000000,
      USDT: 1000000,
      WETH: 1,
      DAI: 1,
      MATIC: 1,
    },
    similarTokens: {
      1: ['ETH', 'WETH'],
      5: ['ETH', 'WETH'],
      137: ['MATIC', 'WMATIC'],
      80001: ['MATIC', 'WMATIC'],
    },
    nativeChainIds: {
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
    decimals: {
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
        USDT: 6,
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
  },
  tokenPrice: {
    coinMarketCapApi: '',
    networkSymbols: {},
    updateFrequencyInSeconds: 0,
    symbolMapByChainId: {},
  },
};
const configInstance = new Config(data);
export const config = configInstance.get();
