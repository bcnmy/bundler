import { ethers } from 'ethers';
import { type } from 'os';
import { TransactionType, SymbolMapByChainIdType } from '../../common/types';
import { port } from '../../server/src/server';

type ChainIdWithStringValueType = {
  [key: number]: string
};

type ChainIdWithArrayStringValueType = {
  [key: number]: string[]
};

type ChainIdWithNumberValueType = {
  [key: number]: number
};

type ChainIdWithBigNumberValueType = {
  [key: number]: ethers.BigNumber
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
  gasLimitMap: ChainIdWithNumberValueType,
  minRelayerCount: ChainIdWithNumberValueType,
  maxRelayerCount: ChainIdWithNumberValueType,
  inactiveRelayerCountThreshold: ChainIdWithNumberValueType,
  pendingTransactionCountThreshold: ChainIdWithNumberValueType,
  fundingRelayerAmount: ChainIdWithNumberValueType,
  fundingBalanceThreshold: ChainIdWithBigNumberValueType,
  newRelayerInstanceCount: ChainIdWithNumberValueType,
  ownerAccountDetails: OwnerAccountDetailsType,
}>;

type TransactionConfigType = {
  errors: {
    networkResponseCodes: ChainIdWithStringValueType,
    networksNonceError: ChainIdWithStringValueType,
    networksInsufficientFundsError: ChainIdWithStringValueType,
  }
};

type ChainsConfigType = {
  currency: ChainIdWithStringValueType,
  decimal: ChainIdWithNumberValueType,
  provider: ChainIdWithStringValueType,
  fallbackUrls: ChainIdWithArrayStringValueType,
  retryTransactionInterval: ChainIdWithNumberValueType
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

/* CCMP configurations */
type CCMPBridgesConfigType = {
  [key: string]: any
};

// { "contractName": "contractAddress" }
type CCMPContractsAddressChainConfigType = {
  [key: string]: string
};

// { "chainId": { "contractName": "contractAddress" } }
type CCMPContractsConfigType = {
  [key:string]: CCMPContractsAddressChainConfigType
};

type CCMPWebhookContractEventFilterConfigType = {
  [key:string]: string
};

type CCMPWebhookContractEventsConfigType = {
  name: string,
  topicId: string,
  blockConfirmations: number,
  processTransferLogs: boolean,
  filters: CCMPWebhookContractEventFilterConfigType[]
};

type CCMPWebhookContractsConfigType = {
  scAddress: string,
  events: CCMPWebhookContractEventsConfigType[]
  abi: string,
};

type CCMPWebhookRequestType = {
  auth: string,
  chainId: number,
  contracts: CCMPWebhookContractsConfigType[],
  active: boolean
};

type CCMPWebhooksConfigType = {
  endpoint: string,
  registrationUrl: string,
  requests: CCMPWebhookRequestType[]  
};

type CCMPConfigType = {
  bridges: CCMPBridgesConfigType,
  contracts: CCMPContractsConfigType,
  webhooks: CCMPWebhooksConfigType
};

export type ConfigType = {
  queueUrl: string,
  slack: SlackConfigType,
  dataSources: DataSourcesConfigType,
  socketService: SocketServiceConfigType,
  supportedNetworks: Array<number>,
  EIP1559SupportedNetworks: Array<number>,
  supportedTransactionType: ChainIdSupportedTransactionType,
  chains: ChainsConfigType,
  relayer: RelayerConfigType,
  relayerManagers: RelayerManagerConfigType,
  ccmp: CCMPConfigType,
  transaction: TransactionConfigType,
  gasPrice: GasPriceConfigType,
  feeOption: FeeOptionConfigType,
  tokenPrice: TokenPriceConfigType,
  entryPointData: EntryPointDataConfigType,
  zeroAddress: string,
  simulationData: SimulationDataConfigType
};

export interface IConfig {
  update(data: object): boolean

  get(): ConfigType | null
}
