import { generateTransactionId } from './tx-id-generator';

export const getGasUsedInSimulationKey = (wallet: string, to: string, data: string) => generateTransactionId(`GasUsed_${wallet}_${to}_${data}`);

export const getRetryTransactionCountKey = (transactionId: string, chainId: number) => `RetryTransactionCount_${transactionId}_${chainId}`;

export const getTokenPriceKey = () => 'NETWORK_PRICE_DATA';

export const getCacheMempoolKey = (chainId: number, entryPointAddress: string) => `Cache_Mempool_chainId_${chainId}_entryPointAddress_${entryPointAddress}`;
