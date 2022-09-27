import { TransactionType } from '../../common/types';

export interface LooseObject {
  [key: string]: any
}

export type ConfigType = {
  slack: {
    token: string,
    channel: string,
  },
  dataSources: {
    mongoUrl: string, // env file
    redisUrl: string,
  },
  socketService: {
    wssUrl: string,
    httpUrl: string,
    secret: string,
    apiKey: string,
  },
  supportedNetworks: Array<number>,
  supportedTransactionType: {
    [key: number]: Array<TransactionType>
  },
  chains: {
    currency: {
      [key: number]: string,
    },
    decimal: {
      [key: number]: number,
    },
    provider: {
      [key: number]: string,
    },
    ownerAccountDetails: {
      [key: number]: {
        publicKey: string,
        privateKey: string,
      }
    }
  },
  relayer: {
    nodePathIndex: number,
  },
  relayerManager: [{
    name: string, // assume it to be an identifier by the consumer
    gasLimitMap: {
      [key: number]: number
    }
    minRelayerCount: {
      [key: number]: number
    },
    maxRelayerCount: {
      [key: number]: number
    },
    inactiveRelayerCountThreshold: {
      [key: number]: number
    },
    pendingTransactionCountThreshold: {
      [key: number]: number
    },
    fundingRelayerAmount: {
      [key: number]: number
    },
    newRelayerInstanceCount: {
      [key: number]: number
    },
  }],
  transaction: {
    errors: {
      networkResponseCodes: {
        [key: number]: string
      },
      networksNonceError: {
        [key: number]: string
      },
      networksInsufficientFundsError: {
        [key: number]: string
      }
    }
  },
  gasPrice: { // add validation to check the object exists for network id 137
    [key: number]: {
      updateFrequencyInSeconds: number,
      minGasPrice: number,
      maxGasPrice: number,
      baseFeeMultiplier: number,
      gasOracle: {
        [key: string]: string,
      },
    }
  },
  feeOption: {
    supportedFeeTokens: {
      [key:number]: Array<string>
    },
    offset: {
      [key: string]: number
    },
    similarTokens: {
      [key:number]: Array<string> // mapping for wrapped token with token id
    },
    nativeChainIds: {
      [key: string]: number
    },
    logoUrl: {
      [key: string]: string
    },
    tokenContractAddress: {
      [key: number]: {
        [key: string]: string;
      }
    },
    decimals: {
      [key: number]: {
        [key: string]: number;
      }
    },
    feeTokenTransferGas: {
      [key: number]: {
        [key: string]: number;
      }
    }
  },
  tokenPrice: {
    coinMarketCapApi: string,
    networkSymbols: {
      [key: string]: Array<number>
    },
    updateFrequencyInSeconds: number,
    symbolMapByChainId: {
      [key: number]: {
        [key: string]: string,
      }
    }
  },
  queueUrl: string,
  entryPointData: {
    abi: string,
    address: {
      [key: number]: string
    }
  }
};

export interface IConfig {
  update(data: object): boolean

  get(): ConfigType | null
}
