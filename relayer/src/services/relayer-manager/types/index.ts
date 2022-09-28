import { IGasPrice } from '../../../../../common/gas-price/interface/IGasPrice';
import { INetworkService } from '../../../../../common/network';
import { AATransactionMessageType } from '../../../../../common/types';
import { EVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionService } from '../../transaction-service';

export type EVMRelayerManagerServiceParamsType = {
  networkService: INetworkService<EVMAccount, AATransactionMessageType>,
  gasPriceService: IGasPrice,
  transactionService: ITransactionService<EVMAccount>,
  nonceManagerService: INonceManager,
  options: {
    chainId: number,

  },
};

export type EVMRelayerDataType = {
  address: string;
  nonce: number;
  pendingCount: number;
  balance: number;
};
