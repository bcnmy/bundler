import { IQueue } from '../../../../../common/interface';
import { AATransactionMessageType, EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount } from '../../account';
import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';

export type AAConsumerParamsType = {
  queue: IQueue<AATransactionMessageType>,
  relayerManager: IRelayerManager<EVMAccount, EVMRawTransactionType>,
  transactionService: ITransactionService<EVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number,
  },
};

export type SCWConsumerParamsType = AAConsumerParamsType;
