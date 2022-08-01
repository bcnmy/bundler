export type TransactionDataType = {
  transactionId: string;
  transactionHash: string;
  previousTransactionHash: string;
  status: string;
  metaTxData: object;
  metaTxApproach: string;
  rawTransaction: object;
  apiId: string;
  apiName: string;
  networkId: string;
  gasPrice: string;
  dappId: string;
  receipt: object;
  relayerAddress: string;
  signerAddress: string;
  transactionFee: number;
  transactionFeeCurrency: string;
  baseCurrencyInFiat: string;
  transactionFeeInFiat: number;
  transactionFeeInFiatCurrency: string;
  retryCount: number;
  creationTime: number;
  updationTime: number;
  ipAddress: string;
};

export interface IDaoUtils {
  findPendingTransactions(networkId: number): Promise<any>
  getTransaction(query: object, networkId: number): Promise<any>
  updateTransaction(query: object, networkId: number, data: TransactionDataType): Promise<any>
}
