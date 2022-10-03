export interface IBlockchainTransaction {
  transactionId: string;
  transactionHash: string;
  status: string;
  rawTransaction: object;
  chainId: number;
  gasPrice: string;
  receipt: object;
  relayerAddress: string;
  userAddress: string;
  resubmitted: boolean;
  creationTime: number;
  updationTime: number;
}
