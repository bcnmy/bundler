import { ConsumeMessage } from 'amqplib';
import { RawTransactionType } from 'network-sdk/dist/types';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, TransactionQueueMessageType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';
import { EVMRetryTransactionServiceParamsType } from './types';

const log = logger(module);
export class EVMRetryTransactionService implements
IRetryTransactionService<IEVMAccount, EVMRawTransactionType> {
  transactionService: ITransactionService<IEVMAccount, RawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  chainId: number;

  queue: IQueue<TransactionQueueMessageType>;

  constructor(evmRetryTransactionServiceParams: EVMRetryTransactionServiceParamsType) {
    const {
      options, transactionService, networkService, retryTransactionQueue,
    } = evmRetryTransactionServiceParams;
    this.chainId = options.chainId;
    this.transactionService = transactionService;
    this.networkService = networkService;
    this.queue = retryTransactionQueue;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      log.info(`Message received from retry transction queue on chainId: ${this.chainId}: ${JSON.stringify(msg.content.toString())}`);
      this.queue.ack(msg);
    } else {
      log.info(`Message not received on retry transaction queue on chainId: ${this.chainId}`);
    }
  };
}
