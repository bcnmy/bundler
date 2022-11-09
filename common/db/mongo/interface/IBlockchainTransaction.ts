export interface IBlockchainTransaction {
  transactionId: string; // REVIEW // In case of funding relayer transactions no transactionId
  transactionHash: string;
  status: string;
  rawTransaction: object;
  chainId: number;
  gasPrice: string;
  receipt: object;
  relayerAddress: string;
  walletAddress: string;
  metaData: any;
  resubmitted: boolean;
  creationTime: number;
  updationTime: number;
}
