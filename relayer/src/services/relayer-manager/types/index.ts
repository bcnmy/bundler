import { ICacheService } from '../../../../../common/cache';
import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { INotificationManager } from '../../../../../common/notification/interface';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { EVMRelayerMetaDataType, IRelayerQueue } from '../../relayer-queue';
import { ITransactionService } from '../../transaction-service';

export type EVMRelayerManagerServiceParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  gasPriceService: IGasPrice,
  cacheService: ICacheService,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>,
  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>,
  notificationManager: INotificationManager;
  options: {
    name: string;
    chainId: number;
    relayerSeed: string;
    minRelayerCount: number;
    maxRelayerCount: number;
    inactiveRelayerCountThreshold: number;
    pendingTransactionCountThreshold: number;
    newRelayerInstanceCount: number;
    fundingBalanceThreshold: bigint;
    fundingRelayerAmount: number,
    gasLimitMap: {
      [key: number]: number
    },
    ownerAccountDetails: IEVMAccount,
  },
};
