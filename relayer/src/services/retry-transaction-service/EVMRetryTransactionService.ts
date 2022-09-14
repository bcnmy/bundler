import { ConsumeMessage } from 'amqplib';
import { EVMAccount } from '../account';
import { TransactionQueueMessageType } from '../transaction-publisher';
import { ITransactionService } from '../transaction-service/interface/interface';
import { IRetryTransactionService } from './interface/interface';

export class EVMRetryTransactionService implements IRetryTransactionService<EVMAccount> {
  // TODO
  // Keep publish?
  publish(arg0: TransactionQueueMessageType): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  transactionService: ITransactionService<EVMAccount>;

  chainId: number;

  transactionType?: string | undefined;

  connect(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  consume(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  ack(arg0: ConsumeMessage): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getBumpedGasPrice(pastGasPrice: string, bumpingPercentage: number): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
