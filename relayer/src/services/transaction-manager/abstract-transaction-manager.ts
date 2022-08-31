/* eslint-disable max-len */

import { Network } from 'network-sdk';
import {
  getTransactionDataKey, getTransactionKey,
} from '../../utils/cache-utils';
import { cache } from '../../../../common/caching';

export abstract class AbstarctTransactionManager {
  // TODO
  // Check if chainId is there for non EVM chains
  chainId: number;

  network: Network;

  constructor(chainId: number, network: Network) {
    this.network = network;
    this.chainId = chainId;
  }

  abstract getGasPrice(): Promise<String>;

  abstract sendTransaction(relayer: IRelayer, transactionData: ITransactionData) :Promise<SendTransactionReturnType>;

  abstract sendRetryTransaction(relayer: IRelayer, transactionData: ITransactionData): Promise<any>;

  abstract saveTransactionDataToDb(): Promise<any>;

  abstract onTransactionMined(): Promise<any>;

  abstract onTransactionDropped(): Promise<any>;

  abstract waitForTransactionResponse(): Promise <any>;

  abstract shouldRetryTransaction(err: any): Promise<boolean>;

  static async removeRetry(transactionId: string): Promise<void> {
    await cache.deleteKey(getTransactionDataKey(transactionId));
    await cache.deleteKey(getTransactionKey(transactionId));
  }
}
