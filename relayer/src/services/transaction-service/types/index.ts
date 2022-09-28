import { BigNumber } from 'ethers';
import { ITransactionDAO } from '../../../../../common/db';
import { IGasPrice } from '../../../../../common/gas-price/interface/IGasPrice';
import { GasPriceType } from '../../../../../common/gas-price/types';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';

export type EVMTransactionServiceParamsType = {
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
  transactionListener: ITransactionListener,
  nonceManager: INonceManager,
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
  gasLimitFromClient ?: number;
  gasLimitFromSimulation: number;
  speed: GasPriceType;
  userAddress?: string,
  transactionId: string;
};

export type CreateRawTransactionParamsType = {
  from: string,
  to: string;
  value: string;
  data: string;
  gasLimit: number;
  speed: GasPriceType;
  account: IEVMAccount<EVMRawTransactionType>;
};

export type CreateRawTransactionReturnType = {
  from: string,
  to: string;
  value: string;
  gasPrice: BigNumber;
  gasLimit: number;
  data: string;
  chainId: number;
  nonce: number;
};

export type ExecuteTransactionParamsType = {
  rawTransaction: EVMRawTransactionType,
  account: IEVMAccount<EVMRawTransactionType>
};

export type EVMTransactionResponseType = TransactionResponseType;
