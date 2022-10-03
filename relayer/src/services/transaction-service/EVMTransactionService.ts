import { ethers } from 'ethers';
import { ITransactionService } from './interface/ITransactionService';
import { ITransactionListener } from '../transaction-listener';
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ExecuteTransactionParamsType,
  TransactionDataType,
  EVMTransactionServiceParamsType,
} from './types';
import { INonceManager } from '../nonce-manager';
import { INetworkService } from '../../../../common/network';
import { IEVMAccount } from '../account';
import { EVMRawTransactionType } from '../../../../common/types';
import { IGasPrice } from '../../../../common/gas-price';

export class EVMTransactionService implements
ITransactionService<IEVMAccount, EVMRawTransactionType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;

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
    const nonce = await this.nonceManager.getNonce(account.getPublicKey());
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
    const transactionExecutionResponse = await this.networkService.sendTransaction(
      rawTransaction,
      account,
    );
    await this.nonceManager.incrementNonce(account.getPublicKey());
    return transactionExecutionResponse;
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount,
  ): Promise<ethers.providers.TransactionResponse> {
    // create transaction
    // get gas price
    // send transaction
    // tell to transaction listener
    // save data in db
    const {
      to, value, data, gasLimit,
      speed, transactionId, userAddress,
    } = transactionData;
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
    console.log('transactionExecutionResponse', transactionExecutionResponse);
    await this.nonceManager.incrementNonce(account.getPublicKey());
    await this.transactionListener.notify({
      transactionExecutionResponse,
      transactionId: transactionId as string,
      relayerAddress: account.getPublicKey(),
      userAddress,
    });
    return transactionExecutionResponse;
  }
}
