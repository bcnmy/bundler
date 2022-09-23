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
import { EVMRawTransactionType, TransactionStatus } from '../../../../common/types';
import { GasPriceType } from '../../../../common/gas-price/types';
import { IGasPrice } from '../../../../common/gas-price/interface/IGasPrice';
import { ITransactionDAO } from '../../../../common/db';

export class EVMTransactionService implements
ITransactionService<IEVMAccount<EVMRawTransactionType>> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager;

  gasPriceService: IGasPrice;

  transactionDao: ITransactionDAO;

  constructor(transactionServiceParams: TransactionServiceParamsType) {
    const {
      chainId, networkService, transactionListener, nonceManager, gasPriceService, transactionDao,
    } = transactionServiceParams;
    this.chainId = chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;
    this.gasPriceService = gasPriceService;
    this.transactionDao = transactionDao;
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

  private async notifyTransactionListener(transactionExecutionResponse: object): Promise<void> {
    // call transaction listener
    await this.transactionListener.notify(transactionExecutionResponse);
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

  private async saveTransactionDataToDatabase(
    transactionExecutionResponse: ethers.providers.TransactionResponse,
    transactionId: string,
    relayerAddress: string,
    userAddress?: string,
  ): Promise<void> {
    const transactionDataToBeSaveInDatabase = {
      transactionId,
      transactionHash: transactionExecutionResponse.hash,
      status: TransactionStatus.PENDING,
      rawTransaction: transactionExecutionResponse,
      chainId: this.chainId,
      gasPrice: transactionExecutionResponse.gasPrice,
      receipt: {},
      relayerAddress,
      userAddress,
      creationTime: Date.now(),
      updationTime: Date.now(),
    };
    await this.transactionDao.save(this.chainId, transactionDataToBeSaveInDatabase);
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
      to, value, data, gasLimitFromClient, gasLimitInSimulation, speed, userAddress, transactionId,
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
    await this.notifyTransactionListener(transactionExecutionResponse);
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      account.getPublicKey(),
      userAddress,
    );
    return transactionExecutionResponse;
  }
}
