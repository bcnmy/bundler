export const getRetryTransactionCountKey = (transactionId: string, chainId: number) => `RetryTransactionCount_${transactionId}_${chainId}`;

export const getFailedTransactionRetryCountKey = (transactionId: string, chainId: number) => `FailedTransactionRetryCount_${transactionId}_${chainId}`;

export const getTokenPriceKey = () => 'NETWORK_PRICE_DATA';

export const getTransactionMinedKey = (transactionId: string) => `TransactionMined_${transactionId}`;
