import { ConsumeMessage } from 'amqplib';
import { EVMNetworkService, INetworkService, Type0TransactionGasPriceType } from '../../../../common/network';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, TransactionType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IEVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';
import { TransactionQueueMessageType } from './types';

export class EVMRetryTransactionService implements IRetryTransactionService<EVMAccount> {
  transactionService: ITransactionService<EVMAccount>;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  chainId: number;

  transactionType: TransactionType;

  queue: IQueue<TransactionQueueMessageType>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<EVMAccount>,
    transactionType: TransactionType,
    networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
    queue: IQueue<TransactionQueueMessageType>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;
    this.networkService = networkService;
    this.transactionType = transactionType;
    this.queue = queue;
  }

  static getBumpedGasPrice(
    pastGasPrice: Type0TransactionGasPriceType,
    bumpingPercentage: number,
  ): Type0TransactionGasPriceType {
    return EVMNetworkService.getBumpedUpGasPrice(pastGasPrice, bumpingPercentage);
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
