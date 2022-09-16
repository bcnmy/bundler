import { ConsumeMessage } from 'amqplib';
import { EVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';

export class EVMRetryTransactionService implements IRetryTransactionService<EVMAccount> {
  transactionService: ITransactionService<EVMAccount>;

  chainId: number;

  transactionType?: string | undefined;

  constructor(chainId: number, transactionService: ITransactionService<EVMAccount>) {
    this.chainId = chainId;
    this.transactionService = transactionService;
  }

  connect(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  onMessageReceived: (msg: ConsumeMessage) => Promise<void>;

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
