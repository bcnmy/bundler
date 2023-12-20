import { Transaction } from 'viem';
import { ICacheService } from '../../../../../common/cache';
import { ITransactionDAO, IUserOperationStateDAO } from '../../../../../common/db';
import { IGasPrice } from '../../../../../common/gas-price';
import { GasPriceType } from '../../../../../common/gas-price/types';
import { INetworkService } from '../../../../../common/network';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import { INotificationManager } from '../../../../../common/notification/interface';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import { TransactionListenerNotifyReturnType } from '../../transaction-listener/types';

export type EVMTransactionServiceParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType>,
  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>,
  gasPriceService: IGasPrice,
  transactionDao: ITransactionDAO,
  cacheService: ICacheService,
  notificationManager: INotificationManager,
  userOperationStateDao: IUserOperationStateDAO
  options: {
    chainId: number,
  }
};

export type TransactionResponseType = {
  chainId: number;
  transactionId: string;
  transactionHash: string;
  relayerAddress: string;
};

export type TransactionDataType = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit: `0x${string}`;
  speed?: GasPriceType;
  walletAddress: string,
  transactionId: string;
  metaData?: {
    dappAPIKey: string
  }
};

export type ErrorTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'failed';
  code: number;
  error: string;
  transactionId: string;
};

export type SuccessTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'success';
  code: number;
  transactionId: string
};

export type CreateRawTransactionParamsType = {
  from: string,
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit: `0x${string}`;
  speed?: GasPriceType;
  account: IEVMAccount;
  transactionId: string
};

export type CreateRawTransactionReturnType = EVMRawTransactionType;

export type ExecuteTransactionParamsType = {
  rawTransaction: EVMRawTransactionType,
  account: IEVMAccount
};

export type ExecuteTransactionResponseType = {
  success: true;
  transactionResponse: Transaction,
} | {
  success: false;
  error: string;
};

export type EVMTransactionResponseType = TransactionResponseType;

export type RetryTransactionDataType = RetryTransactionQueueData;
