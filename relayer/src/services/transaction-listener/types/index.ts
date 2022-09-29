import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';

export type TransactionListenerMessageType = {
  // TODO
  // Define the struct to send
};

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
  queue: IQueue<TransactionListenerMessageType>,
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
