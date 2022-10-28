import { ethers } from 'ethers';
import { EVMRawTransactionType, TransactionType } from '../../types';

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type RetryTransactionQueueData = {
  relayerAddress: string,
  transactionType: TransactionType,
  transactionHash: string,
  transactionId: string,
  rawTransaction: EVMRawTransactionType,
  userAddress: string,
  relayerManagerName: string
};
