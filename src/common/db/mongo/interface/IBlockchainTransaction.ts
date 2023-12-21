type RawTransactionType = {
  from: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  gasLimit: {
    _hex: string;
    _isBigNumber: boolean;
  };
  to: string;
  value: {
    _hex: string;
    _isBigNumber: boolean;
  };
  data: string;
  chainId: number;
  nonce: number;
};

export interface IBlockchainTransaction {
  transactionId: string;
  transactionType: string;
  transactionHash: string;
  previousTransactionHash?: string;
  status: string;
  rawTransaction: RawTransactionType;
  chainId: number;
  gasPrice: string;
  receipt: object;
  transactionFee: number;
  transactionFeeInUSD: number;
  transactionFeeCurrency: string
  refundTokenAddress: string;
  refundTokenCurrency: string;
  refundAmount: number;
  refundAmountInUSD: number;
  relayerDestinationContractAddress: string;
  relayerDestinationContractName: string;
  relayerAddress: string;
  walletAddress: string;
  metaData: any;
  resubmitted: boolean;
  creationTime: number;
  updationTime: number;
  frontRunnedTransactionHash: string;
  frontRunnedReceipt: object,
  frontRunnedTransactionFee: number,
  frontRunnedTransactionFeeInUSD: number,
  frontRunnedTransactionFeeCurrency: string,
}
