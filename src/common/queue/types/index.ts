import { Transaction } from 'viem';
import { EVMRawTransactionType, SocketEventType, TransactionType } from '../../types';

export type TransactionMessageType = Transaction;

export type RetryTransactionQueueData = {
  relayerAddress: string,
  transactionType: TransactionType,
  transactionHash?: string,
  transactionId: string,
  rawTransaction: EVMRawTransactionType,
  walletAddress: string,
  metaData: any,
  relayerManagerName: string,
  event: SocketEventType
};
