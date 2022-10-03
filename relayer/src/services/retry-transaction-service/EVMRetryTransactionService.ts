import { ConsumeMessage } from 'amqplib';
import { RawTransactionType } from 'network-sdk/dist/types';
import { INetworkService } from '../../../../common/network';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, TransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';
import { TransactionQueueMessageType } from './types';

export class EVMRetryTransactionService implements
IRetryTransactionService<IEVMAccount, EVMRawTransactionType> {
  transactionService: ITransactionService<IEVMAccount, RawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  chainId: number;

  transactionType: TransactionType;

  queue: IQueue<TransactionQueueMessageType>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
    transactionType: TransactionType,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    queue: IQueue<TransactionQueueMessageType>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;
    this.networkService = networkService;
    this.transactionType = transactionType;
    this.queue = queue;
  }

  async onMessageReceived(
    msg: ConsumeMessage,
    queue: IQueue<TransactionQueueMessageType>,
  ) {
    // TODO
    console.log(this.chainId);
    console.log(msg, queue);
  }
}
