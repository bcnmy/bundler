import { TransactionType } from '../../types';

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
      [key: number]: string,
    },
    provider: {
      [key: number]: string,
    },
    gasPriceUpdateFrequency: {
      [key: number]: string,
    },
    ownerAccountDetails: {
      [key: number]: {
        publicKey: string,
        privateKey: string,
      }
    }
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
        [key: string]: string
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
      minGasPrice: number,
      maxGasPrice: number,
      baseFeeMultiplier: number,
      gasOracle: {
        [key: string]: string,
      },
    }
  }

};

export interface IConfig {
  setup(): void

  update(data: object): boolean

  get(): ConfigType | null
}
