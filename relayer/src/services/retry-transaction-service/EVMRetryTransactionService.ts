import { ConsumeMessage } from 'amqplib';
import { RawTransactionType } from 'network-sdk/dist/types';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRetryTransactionService } from './interface/IRetryTransactionService';
import { EVMRetryTransactionServiceParamsType, TransactionQueueMessageType } from './types';

const log = logger(module);
export class EVMRetryTransactionService implements
IRetryTransactionService<IEVMAccount, EVMRawTransactionType> {
  transactionService: ITransactionService<IEVMAccount, RawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  chainId: number;

  constructor(evmRetryTransactionServiceParams: EVMRetryTransactionServiceParamsType) {
    const {
      options, transactionService, networkService,
    } = evmRetryTransactionServiceParams;
    this.chainId = options.chainId;
    this.transactionService = transactionService;
    this.networkService = networkService;
  }

  async onMessageReceived(
    msg?: ConsumeMessage,
  ) {
    const self = this as unknown as IQueue<TransactionQueueMessageType>;
    if (msg) {
      log.info(`Message received from retry transction queue: ${JSON.stringify(msg.content.toString())} on chainId: ${this.chainId}`);
      self.ack(msg);
    } else {
      log.info(`Message not received on retry transaction queue on chainId: ${this.chainId}`);
    }
  }
}
