export interface IBlockchainTransaction {
  transactionId: string;
  transactionHash: string;
  previousTransactionHash: string;
  status: string;
  metaTxData: object;
  metaTxApproach: string;
  rawTransaction: object;
  networkId: number;
  gasPrice: string;
  contractAddress: string;
  receipt: object;
  relayerAddress: string;
  signerAddress: string;
  transactionFee: number;
  transactionFeeCurrency: string;
  baseCurrencyInFiat?: number;
  transactionFeeInFiat?: number;
  transactionFeeInFiatCurrency?: string;
  gasUsed: number;
  gasLimit: number;
  resubmitted: boolean;
  creationTime: number;
  updationTime: number;
  ipAddress: string;
}
