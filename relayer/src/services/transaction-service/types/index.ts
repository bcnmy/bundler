import { GasPriceType } from '../../../../../common/gas-price/types';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';

export type TransactionServiceParamsType = {
  chainId: number,
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
  transactionListener: ITransactionListener,
  nonceManager: INonceManager
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
  gasLimitInSimulation: number;
  speed ?: GasPriceType;
  transactionId: string;
};

export type EVMTransactionResponseType = TransactionResponseType;
