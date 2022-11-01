import { ethers } from 'ethers';
import type {
  CCMPMessage,
  EVMRawTransactionType,
  SocketEventType,
  TransactionType,
} from '../../types';

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type RetryTransactionQueueData = {
  relayerAddress: string;
  transactionType: TransactionType;
  transactionHash: string;
  transactionId: string;
  rawTransaction: EVMRawTransactionType;
  userAddress: string;
  relayerManagerName: string;
  event: SocketEventType;
};

export type CrossChainRetryQueueData = {
  transationType: TransactionType.CROSS_CHAIN;
  transactionId: string;
  message: CCMPMessage;
  sourceChainTxHash: string;
};
