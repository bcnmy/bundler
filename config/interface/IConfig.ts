import { SymbolMapByChainIdType, TransactionType, DefaultGasOverheadType } from '../../common/types';

type ChainIdWithStringValueType = {
  [key: number]: string
};

type ChainIdWithArrayStringValueType = {
  [key: number]: string[]
};

type ChainIdWithNumberValueType = {
  [key: number]: number
};

type ChainIdAndTokenWithNumberValueType = {
  [key: number]: {
    [key: string]: number;
  }
};

type ChainIdAndTokenWithStringValueType = {
  [key: number]: {
    [key: string]: string;
  }
};

type OwnerAccountDetailsType = {
  [key: number]: {
    publicKey: string,
    privateKey: string,
  }
};

type SocketServiceConfigType = {
  wssUrl: string,
  httpUrl: string,
  token: string,
  apiKey: string,
};

type GasPriceConfigType = {
  [key: number]: {
    updateFrequencyInSeconds: number,
    minGasPrice: number,
    maxGasPrice: number,
    baseFeeMultiplier: number,
    gasOracle: {
      [key: string]: string,
    },
  }
};

type NetworkSymbolMapType = {
  [key: string]: Array<number>
};

type NativeChainIdMapType = {
  [key: string]: number
};

type FeeOptionConfigType = {
  supportedFeeTokens: ChainIdWithArrayStringValueType,
  similarTokens: ChainIdWithArrayStringValueType,
  nativeChainIds: NativeChainIdMapType,
  offset: ChainIdAndTokenWithNumberValueType,
  logoUrl: ChainIdAndTokenWithStringValueType,
  tokenContractAddress: ChainIdAndTokenWithStringValueType,
  decimals: ChainIdAndTokenWithNumberValueType,
  feeTokenTransferGas: ChainIdAndTokenWithNumberValueType,
  refundReceiver: ChainIdWithStringValueType,
  commission: ChainIdWithNumberValueType,
};

type TokenPriceConfigType = {
  coinMarketCapApi: string,
  networkSymbols: NetworkSymbolMapType,
  updateFrequencyInSeconds: number,
  symbolMapByChainId: SymbolMapByChainIdType,
};

type RelayerManagerConfigType = Array<{
  name: string, // assume it to be an identifier by the consumer
  relayerSeed: string,
  ownerPublicKey: string;
  ownerPrivateKey: string;
  gasLimitMap: ChainIdWithNumberValueType,
  minRelayerCount: ChainIdWithNumberValueType,
  maxRelayerCount: ChainIdWithNumberValueType,
  inactiveRelayerCountThreshold: ChainIdWithNumberValueType,
  pendingTransactionCountThreshold: ChainIdWithNumberValueType,
  fundingRelayerAmount: ChainIdWithNumberValueType,
  fundingBalanceThreshold: ChainIdWithNumberValueType,
  newRelayerInstanceCount: ChainIdWithNumberValueType,
  ownerAccountDetails: OwnerAccountDetailsType,
}>;

type TransactionConfigType = {
  rpcResponseErrorMessages: {
    'ALREADY_KNOWN': string[],
    'REPLACEMENT_TRANSACTION_UNDERPRICED': string[],
    'TRANSACTION_UNDERPRICED': string[],
    'INSUFFICIENT_FUNDS': string[],
    'NONCE_TOO_LOW': string[],
    'GAS_LIMIT_REACHED': string[],
    'MAX_PRIORITY_FEE_HIGHER_THAN_MAX_FEE': string[],
    'RPC_FAILURE': string[]
  },
  retryCount: {
    [key: string]: {
      [key: number]: number
    }
  },
  failedTransactionRetryCount: {
    [key: number]: number
  },
  bumpGasPriceMultiplier: ChainIdWithNumberValueType,
};

type ChainsConfigType = {
  premium: ChainIdWithNumberValueType,
  currency: ChainIdWithStringValueType,
  decimal: ChainIdWithNumberValueType,
  nonceExpiryTTL: ChainIdWithNumberValueType,
  provider: ChainIdWithStringValueType,
  fallbackUrls: ChainIdWithArrayStringValueType,
  retryTransactionInterval: ChainIdWithNumberValueType,
  multiSendAddress: ChainIdWithStringValueType,
  multiSendCallOnlyAddress: ChainIdWithStringValueType,
  walletFactoryAddress: ChainIdWithStringValueType
};

type RelayerConfigType = {
  nodePathIndex: number,
};

type SlackConfigType = {
  token: string,
  channel: string,
};

type ChainIdSupportedTransactionType = {
  [key: number]: Array<TransactionType>
};

type EntryPointDataConfigType = {
  [key: number]: Array<{
    abi: Array<any>,
    address: string,
  }>
};

type DataSourcesConfigType = {
  mongoUrl: string,
  redisUrl: string,
};

// TODO // Review how to make it generic
type SimulationDataConfigType = {
  [key: string]: any
};

type CacheServiceConfigType = {
  lockTTL: number,
};

type AbiConfigType = {
  entryPointAbi: Array<any>,
  smartWalletAbi: Array<any>,
  multiSendAbi: Array<any>,
  multiSendCallOnlyAbi: Array<any>
};

type PaymasterDashboardBackendConfigType = {
  dappDataUrl: string
};

export type ConfigType = {
  queueUrl: string,
  paymasterDashboardBackendConfig: PaymasterDashboardBackendConfigType,
  slack: SlackConfigType,
  dataSources: DataSourcesConfigType,
  socketService: SocketServiceConfigType,
  cacheService: CacheServiceConfigType,
  supportedNetworks: Array<number>,
  EIP1559SupportedNetworks: Array<number>,
  supportedTransactionType: ChainIdSupportedTransactionType,
  chains: ChainsConfigType,
  relayer: RelayerConfigType,
  relayerManagers: RelayerManagerConfigType,
  transaction: TransactionConfigType,
  gasPrice: GasPriceConfigType,
  feeOption: FeeOptionConfigType,
  tokenPrice: TokenPriceConfigType,
  entryPointData: EntryPointDataConfigType,
  zeroAddress: string,
  aaDashboardBackend: {
    url: string
  }
  simulationData: SimulationDataConfigType,
  abi: AbiConfigType,
  defaultGasOverheads: DefaultGasOverheadType
};

export interface IConfig {
  update(data: object): boolean

  get(): ConfigType | null
}
