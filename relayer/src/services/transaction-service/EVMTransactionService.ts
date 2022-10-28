import { ethers } from 'ethers';
import { IGasPrice } from '../../../../common/gas-price';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { ITransactionListener } from '../transaction-listener';
import { ITransactionService } from './interface/ITransactionService';
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ErrorTransactionResponseType,
  EVMTransactionServiceParamsType,
  ExecuteTransactionParamsType,
  SuccessTransactionResponseType,
  TransactionDataType,
} from './types';

const log = logger(module);

export class EVMTransactionService implements
ITransactionService<IEVMAccount, EVMRawTransactionType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType>;

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
    const relayerAddress = account.getPublicKey();

    const nonce = await this.nonceManager.getNonce(relayerAddress, false);
    log.info(`Nonce for relayerAddress: ${nonce}`);
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
      log.info(`Gas price being used to send transaction by relayer: ${relayerAddress} is: ${JSON.stringify(gasPrice)}`);
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
    log.info(`Gas price being used to send transaction by relayer: ${relayerAddress} is: ${gasPrice}`);
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
    return transactionExecutionResponse;
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const relayerAddress = account.getPublicKey();
    const {
      to, value, data, gasLimit,
      speed, transactionId, userAddress,
    } = transactionData;
    log.info(`Transaction request received with transactionId: ${transactionId} on chainId ${this.chainId}`);
    // create transaction
    const rawTransaction = await this.createTransaction({
      from: relayerAddress,
      to,
      value,
      data,
      gasLimit,
      speed,
      account,
    });
    log.info(`Raw transaction for transactionId: ${JSON.stringify(rawTransaction)} on chainId ${this.chainId}`);

    try {
      const transactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        account,
      });
      log.info(`Transaction execution response for transactionId ${transactionData.transactionId}: ${JSON.stringify(transactionExecutionResponse)} on chainId ${this.chainId}`);

      log.info(`Incrementing nonce for account: ${relayerAddress} on chainId ${this.chainId}`);
      await this.nonceManager.incrementNonce(relayerAddress);
      log.info(`Incremented nonce for account: ${relayerAddress} on chainId ${this.chainId}`);

      if (!transactionExecutionResponse.hash) {
        throw new Error('Error in transaction execution');
      }
      log.info(`Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`);
      const transactionListenerNotifyResponse = await this.transactionListener.notify({
        transactionExecutionResponse,
        transactionId: transactionId as string,
        relayerAddress,
        userAddress,
      });

      return {
        state: 'success',
        code: 200,
        ...transactionListenerNotifyResponse,
      };
    } catch (error) {
      log.info(`Error while sending transaction: ${error}`);
      return {
        state: 'failed',
        code: 500,
        error: JSON.stringify(error),
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }
}
