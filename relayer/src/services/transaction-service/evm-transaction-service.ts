import { Network } from 'network-sdk';
import { EVMRawTransactionType } from '../../common';
import { IEVMAccount } from '../account';
import { ITransactionService } from './interface';
import { logger } from '../../../../common/log-config';
import { ITransactionListener } from '../transaction-listener';

const log = logger(module);

// eslint-disable-next-line max-len
export class EVMTransactionService implements ITransactionService<IEVMAccount<EVMRawTransactionType>> {
  chainId: number;

  network: Network;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.network = network;
  }

  private getGasPrice() {
    // Import from service manager class
  }

  private getNonce() {
    // get nonce via nonceManager instance
  }

  private incrementNonce() {
    // increment nonce via nonceManager instance
  }

  private notifyTransactionListener() {
    // call transaction listener
  }

  private createRawTransaction() {
    // create raw transaction basis on data passed

  }

  // eslint-disable-next-line max-len
  sendTransaction(transaction: ITransaction, account: IEVMAccount<EVMRawTransactionType>): Promise<void> {
  }
}
