/* eslint-disable max-len */

import { Network } from 'network-sdk';
import { IRelayer } from '../../relayer/interface';
import { ITransactionData } from '../types';

export interface ITransactionManager {
  chainId: number;

  network: Network;

  getGasPrice(): Promise<string>;
  sendTransaction(relayer: IRelayer, transactionData: ITransactionData) :Promise<SendTransactionReturnType>;
  saveTransactionDataToDatabase(): Promise<any>;
  waitForTransactionResponse(): Promise <any>;
  onTransactionMined(): Promise<any>;
  onTransactionDropped(): Promise<any>;
}
