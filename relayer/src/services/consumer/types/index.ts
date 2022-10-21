import { IQueue } from '../../../../../common/queue';
import { TransactionMessageType } from '../../../../../common/queue/types';
import {
  AATransactionMessageType, EntryPointMapType, EVMRawTransactionType, SCWTransactionMessageType,
} from '../../../../../common/types';
import { EVMAccount } from '../../account';
import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';

export type AAConsumerParamsType = {
  queue: IQueue<AATransactionMessageType>,
  relayerManager: IRelayerManager<EVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<EVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number,
    entryPointMap: EntryPointMapType
  },
};

export type SCWConsumerParamsType = {
  queue: IQueue<SCWTransactionMessageType>,
  relayerManager: IRelayerManager<EVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<EVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number,
  },
};

export type SocketConsumerParamsType = {
  queue: IQueue<TransactionMessageType>;
  options: {
    chainId: number,
    wssUrl: string,
  },
};
