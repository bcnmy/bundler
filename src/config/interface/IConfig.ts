import {
  SymbolMapByChainIdType,
  TransactionType,
  DefaultGasOverheadType,
} from "../../common/types";

type ChainIdWithStringValueType = {
  [key: number]: string;
};

type ChainIdWithArrayStringValueType = {
  [key: number]: string[];
};

type ChainIdWithNumberValueType = {
  [key: number]: number;
};

type ChainIdAndTokenWithNumberValueType = {
  [key: number]: {
    [key: string]: number;
  };
};

type ChainIdAndTokenWithStringValueType = {
  [key: number]: {
    [key: string]: string;
  };
};

type OwnerAccountDetailsType = {
  [key: number]: {
    publicKey: `0x${string}`;
    privateKey: string;
  };
};

type SocketServiceConfigType = {
  wssUrl: string;
  httpUrl: string;
  token: string;
  apiKey: string;
};

type NetworkSymbolMapType = {
  [key: string]: Array<number>;
};

type NativeChainIdMapType = {
  [key: string]: number;
};

type FeeOptionConfigType = {
  supportedFeeTokens: ChainIdWithArrayStringValueType;
  similarTokens: ChainIdWithArrayStringValueType;
  nativeChainIds: NativeChainIdMapType;
  offset: ChainIdAndTokenWithNumberValueType;
  logoUrl: ChainIdAndTokenWithStringValueType;
  tokenContractAddress: ChainIdAndTokenWithStringValueType;
  decimals: ChainIdAndTokenWithNumberValueType;
  feeTokenTransferGas: ChainIdAndTokenWithNumberValueType;
  refundReceiver: ChainIdWithStringValueType;
};

type TokenPriceConfigType = {
  coinMarketCapApi: string;
  networkSymbols: NetworkSymbolMapType;
  symbolMapByChainId: SymbolMapByChainIdType;
};

type RelayerManagerConfigType = Array<{
  name: string; // assume it to be an identifier by the consumer
  relayerSeed: string;
  gasLimitMap: ChainIdWithNumberValueType;
  minRelayerCount: ChainIdWithNumberValueType;
  maxRelayerCount: ChainIdWithNumberValueType;
  inactiveRelayerCountThreshold: ChainIdWithNumberValueType;
  pendingTransactionCountThreshold: ChainIdWithNumberValueType;
  fundingRelayerAmount: ChainIdWithNumberValueType;
  fundingBalanceThreshold: ChainIdWithNumberValueType;
  newRelayerInstanceCount: ChainIdWithNumberValueType;
  ownerAccountDetails: OwnerAccountDetailsType;
}>;

type TransactionConfigType = {
  rpcResponseErrorMessages: {
    ALREADY_KNOWN: string[];
    REPLACEMENT_TRANSACTION_UNDERPRICED: string[];
    TRANSACTION_UNDERPRICED: string[];
    INSUFFICIENT_FUNDS: string[];
    NONCE_TOO_LOW: string[];
    GAS_LIMIT_REACHED: string[];
    MAX_PRIORITY_FEE_HIGHER_THAN_MAX_FEE: string[];
    RPC_FAILURE: string[];
    INTRINSIC_GAS_TOO_LOW: string[];
    MAX_FEE_PER_GAS_LESS_THAN_BLOCK_BASE_FEE: string[];
  };
};

type ChainsConfigType = {
  currency: ChainIdWithStringValueType;
  decimal: ChainIdWithNumberValueType;
  provider: ChainIdWithStringValueType;
  retryTransactionInterval: ChainIdWithNumberValueType;
  updateFrequencyInSeconds: ChainIdWithNumberValueType;
};

type RelayerConfigType = {
  nodePathIndex: number;
};

type SlackConfigType = {
  token: string;
  channel: string;
};

type ChainIdSupportedTransactionType = {
  [key: number]: Array<TransactionType>;
};

type EntryPointDataConfigType = {
  [address: string]: {
    supportedChainIds: Array<number>;
  };
};

type DataSourcesConfigType = {
  mongoUrl: string;
  redisUrl: string;
};

// TODO // Review how to make it generic
type SimulationDataConfigType = {
  [key: string]: any;
};

type CacheServiceConfigType = {
  lockTTL: number;
};

type PaymasterDashboardBackendConfigType = {
  dappDataUrl: string;
};

export type ConfigType = {
  queueUrl: string;
  paymasterDashboardBackendConfig: PaymasterDashboardBackendConfigType;
  slack: SlackConfigType;
  dataSources: DataSourcesConfigType;
  socketService: SocketServiceConfigType;
  cacheService: CacheServiceConfigType;
  supportedNetworks: Array<number>;
  testnetNetworks: Array<number>;
  nonRM2SupportedNetworks: Array<number>;
  EIP1559SupportedNetworks: Array<number>;
  supportedTransactionType: ChainIdSupportedTransactionType;
  chains: ChainsConfigType;
  relayer: RelayerConfigType;
  relayerManagers: RelayerManagerConfigType;
  transaction: TransactionConfigType;
  feeOption: FeeOptionConfigType;
  tokenPrice: TokenPriceConfigType;
  entryPointData: EntryPointDataConfigType;
  zeroAddress: `0x${string}`;
  aaDashboardBackend: {
    url: string;
  };
  simulationData: SimulationDataConfigType;
  defaultGasOverheads: DefaultGasOverheadType;
};

export interface IConfig {
  update(data: object): boolean;

  get(): ConfigType | null;
}
