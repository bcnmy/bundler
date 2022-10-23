import { ethers } from 'ethers';
import { EVMAccount } from '../../../relayer/src/services/account';
import { EVMRawTransactionType } from '../../types';

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type RetryTransactionQueueData = {
  relayerAccount: EVMAccount,
  transactionHash: string,
  transactionId: string,
  rawTransaction: EVMRawTransactionType,
  userAddress: string
};
