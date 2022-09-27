import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/queue';
import { TransactionType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { TransactionQueueMessageType } from '../transaction-publisher';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';

export class EVMRetryTransactionService implements IRetryTransactionService<EVMAccount> {
  transactionService: ITransactionService<EVMAccount>;

  chainId: number;

  transactionType: TransactionType;

  queue: IQueue<TransactionQueueMessageType>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<EVMAccount>,
    transactionType: TransactionType,
    queue: IQueue<TransactionQueueMessageType>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;
    this.transactionType = transactionType;
    this.queue = queue;
  }

  getBumpedGasPrice(pastGasPrice: string, bumpingPercentage: number): Promise<string> {
    throw new Error('Method not implemented.');
  }

  onMessageReceived: (
    msg: ConsumeMessage,
    queue: IQueue<TransactionQueueMessageType>
  ) => Promise<void>;
}
