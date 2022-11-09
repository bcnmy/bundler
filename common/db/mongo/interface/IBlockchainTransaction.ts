import { EVMRawTransactionType } from '../../../types';

export interface IBlockchainTransaction {
  transactionId: string; // REVIEW // In case of funding relayer transactions no transactionId
  transactionType: string;
  transactionHash: string;
  previousTransactionHash?: string;
  status: string;
  rawTransaction: EVMRawTransactionType;
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
