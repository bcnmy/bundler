import { ITransactionDAO } from '../../../../../common/db';
import { IGasPrice } from '../../../../../common/gas-price';
import { GasPriceType } from '../../../../../common/gas-price/types';
import { INetworkService } from '../../../../../common/network';
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
  to: string;
  value: string;
  data: string;
  gasLimit: string; // value will be in hex
  speed?: GasPriceType;
  userAddress?: string,
  transactionId: string;
};

export type ErrorTransactionResponseType = {
  state: 'failed';
  code: number;
  error: string;
};

export type SuccessTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'success';
  code: number;
};

export type CreateRawTransactionParamsType = {
  from: string,
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  speed?: GasPriceType;
  account: IEVMAccount;
};

export type CreateRawTransactionReturnType = EVMRawTransactionType;

export type ExecuteTransactionParamsType = {
  rawTransaction: EVMRawTransactionType,
  account: IEVMAccount
};

export type EVMTransactionResponseType = TransactionResponseType;
