/* eslint-disable import/no-import-module-exports */
import { ConsumeMessage } from 'amqplib';
import { Abi, encodeFunctionData } from 'viem';
import { ICacheService } from '../../../../common/cache';
import { logger } from '../../../../common/logger';
import { IQueue } from '../../../../common/queue';
import {
  AATransactionMessageType, EntryPointMapType, EVMRawTransactionType, TransactionType,
} from '../../../../common/types';
import {
  customJSONStringify, getFailedTransactionRetryCountKey, getRetryTransactionCountKey, parseError
} from '../../../../common/utils';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { AAConsumerParamsType } from './types';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export class AAConsumer implements
ITransactionConsumer<IEVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.AA;

  private queue: IQueue<AATransactionMessageType>;

  chainId: number;

  entryPointMap: EntryPointMapType;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  constructor(
    aaConsumerParams: AAConsumerParamsType,
  ) {
    const {
      options, queue, relayerManager, transactionService, cacheService,
    } = aaConsumerParams;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.transactionService = transactionService;
    this.cacheService = cacheService;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(msg.content.toString());
      log.info(`onMessage received in ${this.transactionType}: ${customJSONStringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);
      // get active relayer
      const activeRelayer = await this.relayerManager.getActiveRelayer();
      log.info(`Active relayer for ${this.transactionType} is ${activeRelayer?.getPublicKey()}`);

      if (activeRelayer) {
        const { userOp, to } = transactionDataReceivedFromQueue;
        const entryPointContracts = this.entryPointMap[this.chainId];

        // TODO Test this via making it a function
        let entryPointContract;
        for (let entryPointContractIndex = 0;
          entryPointContractIndex < entryPointContracts.length;
          entryPointContractIndex += 1) {
          if (entryPointContracts[entryPointContractIndex].address.toLowerCase()
           === to.toLowerCase()) {
            entryPointContract = entryPointContracts[entryPointContractIndex].entryPointContract;
            break;
          }
        }

        log.info(`Setting active relayer: ${activeRelayer?.getPublicKey()} as beneficiary for userOp: ${customJSONStringify(userOp)}`);

        const data = encodeFunctionData({
          abi: (entryPointContract?.abi as Abi),
          functionName: 'handleOps',
          args: [[userOp], activeRelayer.getPublicKey()],
        });

        transactionDataReceivedFromQueue.data = data;

        await this.cacheService.set(getRetryTransactionCountKey(
          transactionDataReceivedFromQueue.transactionId,
          this.chainId,
        ), '0');

        await this.cacheService.set(getFailedTransactionRetryCountKey(
          transactionDataReceivedFromQueue.transactionId,
          this.chainId,
        ), '0');

        // call transaction service
        try {
          const transactionServiceResponse = await this.transactionService.sendTransaction(
            transactionDataReceivedFromQueue,
            activeRelayer,
            this.transactionType,
            this.relayerManager.name,
          );
          log.info(`Response from transaction service for ${this.transactionType} after sending transaction on chainId: ${this.chainId}: ${customJSONStringify(transactionServiceResponse)}`);
          log.info(`Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          await this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
          log.info(`Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          if (transactionServiceResponse.state === 'success') {
            log.info(`Transaction sent successfully for ${this.transactionType} on chain ${this.chainId}`);
          } else {
            log.error(`Transaction failed with error: ${transactionServiceResponse?.error || 'unknown error'} for ${this.transactionType} on chain ${this.chainId}`);
          }
          await this.cacheService.delete(getFailedTransactionRetryCountKey(
            transactionDataReceivedFromQueue.transactionId,
            this.chainId,
          ));
        } catch (error) {
          log.error(`Error in transaction service for transactionType: ${this.transactionType} on chainId: ${this.chainId} with error: ${customJSONStringify(parseError(error))}`);
          log.info(`Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
          log.info(`Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          await this.cacheService.delete(getFailedTransactionRetryCountKey(
            transactionDataReceivedFromQueue.transactionId,
            this.chainId,
          ));
        }
      } else {
        this.queue.publish(JSON.parse(msg.content.toString()));
        log.info(`No active relayer for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
      }
    } else {
      log.info(`No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
    }
  };
}
