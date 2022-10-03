import { ethers } from 'ethers';
import { IGasPrice } from '../../../../common/gas-price';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { ITransactionListener } from '../transaction-listener';
import { NotifyTransactionListenerParamsType } from '../transaction-listener/types';
import { ITransactionService } from './interface/ITransactionService';
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ErrorTransactionResponseType,
  EVMTransactionServiceParamsType,
  ExecuteTransactionParamsType,
  SuccessTransactionResponseType,
  TransactionDataType
} from './types';

const log = logger(module);

export class EVMTransactionService implements
ITransactionService<IEVMAccount<EVMRawTransactionType>> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager;

  gasPriceService: IGasPrice;

  constructor(evmTransactionServiceParams: EVMTransactionServiceParamsType) {
    const {
      options, networkService, transactionListener, nonceManager, gasPriceService,
    } = evmTransactionServiceParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;
    this.gasPriceService = gasPriceService;
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
    const nonce = await this.nonceManager.getNonce(account.getPublicKey(), false);
    const response = {
      from,
      to,
      value,
      gasLimit,
      data,
      chainId: this.chainId,
      nonce,
    };
    const gasPrice = await this.gasPriceService.getGasPrice(speed);
    if (typeof gasPrice !== 'string') {
      const {
        maxPriorityFeePerGas,
        maxFeePerGas,
      } = gasPrice;
      return {
        ...response,
        maxFeePerGas: ethers.utils.hexlify(Number(maxFeePerGas)),
        maxPriorityFeePerGas: ethers.utils.hexlify(Number(maxPriorityFeePerGas)),
      };
    }
    return { ...response, gasPrice: ethers.utils.hexlify(Number(gasPrice)) };
  }

  private async executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
  ): Promise<ethers.providers.TransactionResponse> {
    const { rawTransaction, account } = executeTransactionParams;
    try {
      const transactionExecutionResponse = await this.networkService.sendTransaction(
        rawTransaction,
        account,
      );
      this.incrementNonce(account.getPublicKey());
      return transactionExecutionResponse;
    } catch (error) {
      log.info(`Error while executing transaction: ${error}`);
      throw new Error(JSON.stringify(error));
    }
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount<EVMRawTransactionType>,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const {
      to, value, data, gasLimit,
      speed, transactionId, userAddress,
    } = transactionData;
    // create transaction
    const rawTransaction = await this.createTransaction({
      from: account.getPublicKey(),
      to,
      value,
      data,
      gasLimit,
      speed,
      account,
    });

    try {
      const transactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        account,
      });
      await this.incrementNonce(account.getPublicKey());
      await this.notifyTransactionListener({
        transactionExecutionResponse,
        transactionId: transactionId as string,
        relayerAddress: account.getPublicKey(),
        userAddress,
      });
      return {
        state: 'success',
        code: 200,
        ...transactionExecutionResponse,
      };
    } catch (error) {
      log.info(`Error while sending transaction: ${error}`);
      return {
        state: 'failed',
        code: 500,
        error: JSON.stringify(error),
      };
    }
  }
}
