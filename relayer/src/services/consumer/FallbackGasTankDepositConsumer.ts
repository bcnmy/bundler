import { ConsumeMessage } from 'amqplib';
import { ethers } from 'ethers';
import { ICacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, FallbackGasTankDepositTransactionMessageType, TransactionType } from '../../../../common/types';
import { getRetryTransactionCountKey } from '../../../../common/utils';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { FallbackGasTankDepositConsumerParamsType } from './types';

const log = logger(module);
export class FallbackGasTankDepositConsumer implements
ITransactionConsumer<IEVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.FALLBACK_GASTANK_DEPOSIT;

  private queue: IQueue<FallbackGasTankDepositTransactionMessageType>;

  chainId: number;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  fallbackGasTankDepositOwnerAccountDetails: IEVMAccount;

  constructor(
    fallbackGasTankDepositParam: FallbackGasTankDepositConsumerParamsType,
  ) {
    const {
      options, queue, relayerManager, transactionService, cacheService,
    } = fallbackGasTankDepositParam;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.transactionService = transactionService;
    this.cacheService = cacheService;
    this.chainId = options.chainId;
    this.fallbackGasTankDepositOwnerAccountDetails = options
      .fallbackGasTankDepositOwnerAccountDetails;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(msg.content.toString());
      log.info(`onMessage received in ${this.transactionType}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);

      const {
        transactionId, to, value, gasLimit, data,
      } = transactionDataReceivedFromQueue;

      const rawTx = {
        from: this.fallbackGasTankDepositOwnerAccountDetails.getPublicKey(),
        gasLimit: ethers.BigNumber.from(gasLimit.toString()).toHexString(),
        value: ethers.utils
          .parseEther(value.toString())
          .toHexString(),
        chainId: this.chainId,
      };

      await this.cacheService.set(getRetryTransactionCountKey(
        transactionDataReceivedFromQueue.transactionId,
        this.chainId,
      ), '0');

      const transactionServiceResponse = await this.transactionService.sendTransaction(
        {
          ...rawTx,
          data,
          to,
          transactionId,
          walletAddress: '',
        },
        this.fallbackGasTankDepositOwnerAccountDetails,
        this.transactionType,
        this.relayerManager.name,
      );
      log.info(`Response from transaction service after sending transaction on chaindId: ${this.chainId}: ${JSON.stringify(transactionServiceResponse)}`);
    } else {
      throw new Error(`No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
    }
  };
}
