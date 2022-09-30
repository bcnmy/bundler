import { ethers } from 'ethers';
import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount, EVMAccount } from '../../account';
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
    masterSeed: string;
    minRelayerCount: number;
    maxRelayerCount: number;
    inactiveRelayerCountThreshold: number;
    pendingTransactionCountThreshold: number;
    newRelayerInstanceCount: number;
    fundingBalanceThreshold: ethers.BigNumber;
    fundingRelayerAmount: number,
    gasLimitMap: {
      [key: number]: number
    },
    ownerAccountDetails: EVMAccount,
  },
};

export type EVMRelayerDataType = {
  address: string;
  nonce: number;
  pendingCount: number;
  balance: ethers.BigNumber;
};
