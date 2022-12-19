import type { ICrossChainTransactionDAO } from '../../../../../common/db';
import { ICacheService } from '../../../../../common/cache';
import { IQueue } from '../../../../../common/queue';
import { CrossChainRetryHandlerQueue } from '../../../../../common/queue/CrossChainRetryHandlerQueue';
import {
  AATransactionMessageType,
  CrossChainTransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionQueueMessageType,
} from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';

export type AAConsumerParamsType = {
  queue: IQueue<AATransactionMessageType>,
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  cacheService: ICacheService,
  options: {
    chainId: number,
    entryPointMap: EntryPointMapType
  },
};

export type SCWConsumerParamsType = {
  queue: IQueue<SCWTransactionMessageType>,
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  cacheService: ICacheService,
  options: {
    chainId: number,
  },
};

export type CCMPConsumerParamsType = {
  queue: IQueue<CrossChainTransactionMessageType>,
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  crossChainTransactionDAO: ICrossChainTransactionDAO;
  crossChainRetryHandlerQueue: CrossChainRetryHandlerQueue;
  cacheService: ICacheService,
  options: {
    chainId: number,
  },
};

export type SocketConsumerParamsType = {
  queue: IQueue<TransactionQueueMessageType>;
  options: {
    chainId: number,
    wssUrl: string,
    EVMRelayerManagerMap: {
      [name: string]: {
        [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
      }
    },
  },
};
