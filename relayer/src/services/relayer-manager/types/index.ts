import { IGasPrice } from '../../../../../common/gas-price/interface/IGasPrice';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount } from '../../account';
import { IEVMAccount } from '../../account/interface/IEVMAccount';
import { INonceManager } from '../../nonce-manager';
import { ITransactionService } from '../../transaction-service';

export type EVMRelayerManagerServiceParamsType = {
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
  gasPriceService: IGasPrice,
  transactionService: ITransactionService<EVMAccount>,
  nonceManager: INonceManager,
  options: {
    name: string;
    chainId: number;
    minRelayerCount: number;
    maxRelayerCount: number;
    inactiveRelayerCountThreshold: number;
    pendingTransactionCountThreshold: number;
    newRelayerInstanceCount: number;
    fundingBalanceThreshold: number;
    fundingRelayerAmount: number,
    ownerAccountDetails: {
      [key: number]: {
        publicKey: string,
        privateKey: string,
      }
    }
  },
};

export type EVMRelayerDataType = {
  address: string;
  nonce: number;
  pendingCount: number;
  balance: number;
};
