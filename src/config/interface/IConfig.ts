import { TransactionType } from "../../common/types";

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

type ChainIdWithNumberValueType = {
  [key: number]: number;
};

type RelayerManagerConfigType = Array<{
  name: string; // assume it to be an identifier by the consumer
  relayerSeed: string;
  ownerAddress: `0x${string}`;
  ownerPrivateKey: string;
  gasLimitMap: ChainIdWithNumberValueType;
  minRelayerCount: ChainIdWithNumberValueType;
  maxRelayerCount: ChainIdWithNumberValueType;
  inactiveRelayerCountThreshold: ChainIdWithNumberValueType;
  pendingTransactionCountThreshold: ChainIdWithNumberValueType;
  fundingRelayerAmount: ChainIdWithNumberValueType;
  fundingBalanceThreshold: ChainIdWithNumberValueType;
  newRelayerInstanceCount: ChainIdWithNumberValueType;
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
  // true if this is running on a TrustWallet dedicated setup
  isTWSetup: boolean;
  // array of chain Ids for networks that support https://eips.ethereum.org/EIPS/eip-1559
  EIP1559SupportedNetworks: Array<number>;
  // map of entrypoint addresses -> supported chain Ids
  entryPointData: EntryPointDataConfigType;
  // array of chain Ids for supported L2 networks
  l2Networks: Array<number>;
  // array of chain Ids for networks that are part of the Linea ecosystem
  lineaNetworks: Array<number>;
  // array of chain Ids for networks that are part of the Mantle ecosystem
  mantleNetworks: Array<number>;
  // percentage of maxFeePerGas wrt to the network we are okay to accept
  // for example: a value of 0.5 represents we are okay to accept 50% of the network's maxFeePerGas in the user operation
  maxFeePerGasThresholdPercentage: number;
  // percentage of maxPriorityFeePerGas wrt to the network we are okay to accept
  // for example: a value of 0.5 represents we are okay to accept 50% of the network's maxPriorityFeePerGas in the user operation
  maxPriorityFeePerGasThresholdPercentage: number;
  networksNotSupportingEthCallBytecodeStateOverrides: Array<number>;
  networksNotSupportingEthCallStateOverrides: Array<number>;
  // array of chain Ids for networks that are part of the Optimism ecosystem
  optimismNetworks: Array<number>;
  paymasterDashboardBackendConfig: PaymasterDashboardBackendConfigType;
  // array of chain Ids for networks that are part of the Polygon zkEVM ecosystem
  polygonZKEvmNetworks: Array<number>;
  // percentage of preVerificationGas wrt to the network we are okay to accept
  // for example: a value of 0.5 represents we are okay to accept 50% of the network's max priority fee per gas in the user operation
  preVerificationGasThresholdPercentage: number;
  pvgMarkUp: ChainIdWithNumberValueType;
  // RabbitMQ URL in the format amqp://username:password@host:port
  queueUrl: string;
  relayer: RelayerConfigType;
  // relayer manager configuration (contains secrets)
  relayerManagers: RelayerManagerConfigType;
  // array of chain Ids for networks that are part of the Polygon zkEVM ecosystem
  scrollNetworks: Array<number>;
  // Slack credentials for sending notifications
  slack: SlackConfigType;
  // array of chain Ids for networks that are supported by the Bundler
  supportedNetworks: Array<number>;
  supportedTransactionType: ChainIdSupportedTransactionType;
  // array of chain Ids for networks that are TEST networks
  testnetNetworks: Array<number>;
  // Transaction error messages
  transaction: TransactionConfigType;
  zeroAddress: `0x${string}`;
};

export interface IConfig {
  update(data: object): boolean;

  get(): ConfigType | null;
}
