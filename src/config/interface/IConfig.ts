import {
  SymbolMapByChainIdType,
  TransactionType,
  DefaultGasOverheadType,
} from "../../common/types";

enum RpcProviderType {
  PUBLIC = "public",
  PRIVATE = "private",
}

interface RpcProvider {
  url: string;
  type: RpcProviderType;
}

type ChainIdToProviderList = {
  [key: number]: Array<RpcProvider>;
};

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
  refreshIntervalSeconds: number;
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
  providers: ChainIdToProviderList;
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

// TODO // Review how to make it generic
type SimulationDataConfigType = {
  [key: string]: any;
};

type PaymasterDashboardBackendConfigType = {
  dappDataUrl: string;
};

export type ConfigType = {
  aaDashboardBackend: {
    url: string;
  };
  // array of chain Ids for networks that are supported by Alchemy for simulate execution
  alchemySimulateExecutionSupportedNetworks: Array<number>;
  // array of chain Ids for networks that are part of the Arbitrum ecosystem
  arbitrumNetworks: Array<number>;
  // array of chain Ids for networks that are part of the Astar ecosystem
  astarNetworks: Array<number>;
  // hard-coded Pre-Verification Gas value for the Blast network
  blastPvgValue: number;
  // Redis cache configuration
  cacheService: {
    // lock time to live
    lockTTL: number;
  };
  // network constants for each supported chain
  chains: ChainsConfigType;
  // configuration for Mongo and Redis
  dataSources: {
    mongoUrl: string;
    redisUrl: string;
  };
  // default, hard-coded gas overheads
  defaultGasOverheads: DefaultGasOverheadType;
  // array of chain Ids for networks that support https://eips.ethereum.org/EIPS/eip-1559
  EIP1559SupportedNetworks: Array<number>;
  // map of entrypoint addresses -> supported chain Ids
  entryPointData: EntryPointDataConfigType;
  // legacy fee options configuration
  feeOption: FeeOptionConfigType;
  // array of chain Ids for supported L2 networks
  l2Networks: Array<number>;
  // array of chain Ids for networks that are part of the Linea ecosystem
  lineaNetworks: Array<number>;
  // array of chain Ids for networks that are part of the Mantle ecosystem
  mantleNetworks: Array<number>;
  networksNotSupportingEthCallBytecodeStateOverrides: Array<number>;
  networksNotSupportingEthCallStateOverrides: Array<number>;
  nonRM2SupportedNetworks: Array<number>;
  // array of chain Ids for networks that are part of the Optimism ecosystem
  optimismNetworks: Array<number>;
  paymasterDashboardBackendConfig: PaymasterDashboardBackendConfigType;
  // array of chain Ids for networks that are part of the Polygon zkEVM ecosystem
  polygonZKEvmNetworks: Array<number>;
  pvgMarkUp: ChainIdWithNumberValueType;
  // RabbitMQ URL in the format amqp://username:password@host:port
  queueUrl: string;
  relayer: RelayerConfigType;
  // relayer manager configuration (contains secrets)
  relayerManagers: RelayerManagerConfigType;
  // array of chain Ids for networks that are part of the Polygon zkEVM ecosystem
  scrollNetworks: Array<number>;
  simulationData: SimulationDataConfigType;
  // Slack credentials for sending notifications
  slack: SlackConfigType;
  socketService: SocketServiceConfigType;
  // array of chain Ids for networks that are supported by the Bundler
  supportedNetworks: Array<number>;
  supportedTransactionType: ChainIdSupportedTransactionType;
  // array of chain Ids for networks that are TEST networks
  testnetNetworks: Array<number>;
  tokenPrice: TokenPriceConfigType;
  // Transaction error messages
  transaction: TransactionConfigType;
  zeroAddress: `0x${string}`;
};

export interface IConfig {
  update(data: object): boolean;

  get(): ConfigType | null;
}
