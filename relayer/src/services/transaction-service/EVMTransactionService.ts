import { BigNumber, ethers } from 'ethers';
import { ITransactionService } from './interface/ITransactionService';
import { ITransactionListener } from '../transaction-listener';
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ExecuteTransactionParamsType,
  TransactionDataType,
  TransactionServiceParamsType,
} from './types';
import { INonceManager } from '../nonce-manager';
import { INetworkService } from '../../../../common/network';
import { IEVMAccount } from '../account/interface/IEVMAccount';
import { EVMRawTransactionType } from '../../../../common/types';
import { GasPriceType } from '../../../../common/gas-price/types';
import { IGasPrice } from '../../../../common/gas-price/interface/IGasPrice';
import { NotifyTransactionListenerParamsType } from '../transaction-listener/types';

export class EVMTransactionService implements
ITransactionService<IEVMAccount<EVMRawTransactionType>> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager;

  gasPriceService: IGasPrice;

  constructor(transactionServiceParams: TransactionServiceParamsType) {
    const {
      chainId, networkService, transactionListener, nonceManager, gasPriceService,
    } = transactionServiceParams;
    this.chainId = chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;
    this.gasPriceService = gasPriceService;
  }

  private async getGasPrice(speed: GasPriceType): Promise<BigNumber> {
    // Import from service manager class
    const gasPrice = BigNumber.from(await this.gasPriceService.getGasPrice(speed));
    return gasPrice;
  }

  private async getNonce(address: string): Promise<number> {
    // get nonce via nonceManager instance
    const nonce = await this.nonceManager.getNonce(address);
    return nonce;
  }

  private async incrementNonce(address: string): Promise<void> {
    // increment nonce via nonceManager instance
    await this.nonceManager.incrementNonce(address);
  }

  private async notifyTransactionListener(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<void> {
    // call transaction listener
    await this.transactionListener.notify(notifyTransactionListenerParams);
  }

  private async createTransaction(
    createTransactionParams: CreateRawTransactionParamsType,
  ): Promise<CreateRawTransactionReturnType> {
    // create raw transaction basis on data passed
    const {
      from,
      to,
      value,
      data,
      gasLimit,
      speed,
      account,
    } = createTransactionParams;
    const gasPrice = await this.getGasPrice(speed);
    const nonce = await this.getNonce(account.getPublicKey());
    return {
      from,
      to,
      value,
      gasPrice,
      gasLimit,
      data,
      chainId: this.chainId,
      nonce,
    };
  }

  private async executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
  ): Promise<ethers.providers.TransactionResponse> {
    const { rawTransaction, account } = executeTransactionParams;
    const transactionExecutionResponse = await this.networkService.sendTransaction(
      rawTransaction,
      account,
    );
    this.incrementNonce(account.getPublicKey());
    return transactionExecutionResponse;
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount<EVMRawTransactionType>,
  ): Promise<ethers.providers.TransactionResponse> {
    // create transaction
    // get gas price
    // send transaction
    // tell to transaction listener
    // save data in db
    const {
      to, value, data, gasLimitFromClient, gasLimitInSimulation, speed, transactionId, userAddress,
    } = transactionData;
    const gasLimit = gasLimitFromClient || gasLimitInSimulation;
    const rawTransaction = await this.createTransaction({
      from: account.getPublicKey(),
      to,
      value,
      data,
      gasLimit,
      speed,
      account,
    });
    const transactionExecutionResponse = await this.executeTransaction({
      rawTransaction,
      account,
    });
    await this.incrementNonce(account.getPublicKey());
    await this.notifyTransactionListener({
      transactionExecutionResponse,
      transactionId,
      relayerAddress: account.getPublicKey(),
      userAddress,
    });
    return transactionExecutionResponse;
  }
}
