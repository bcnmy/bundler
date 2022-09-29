import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
  transactionQueue: IQueue<TransactionMessageType>,
  retryTransactionQueue: IQueue<TransactionMessageType>,
  transactionDao: ITransactionDAO,
  options: {
    chainId: number
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse: ethers.providers.TransactionResponse,
  transactionId: string,
  relayerAddress: string,
  userAddress?: string
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;
