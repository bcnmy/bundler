/* eslint-disable max-len */
import { ethers } from 'ethers';
import { IGasPrice } from '../../../../common/gas-price';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType, TransactionType } from '../../../../common/types';
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
  RetryTransactionDataType,
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

  transactionRetryCountMap?: Record<string, number> = {};

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
    // try {
    const { rawTransaction, account } = executeTransactionParams;
    const transactionExecutionResponse = await this.networkService.sendTransaction(
      rawTransaction,
      account,
    );
    return transactionExecutionResponse;
    // } catch (error: any) {
    //   const errInString = error.toString();
    //   log.info(errInString);
    //   const nonceErrorMessage = config.transaction.errors.networksNonceError[this.chainId];
    //   const replacementFeeLowMessage = config.transaction.errors.networkResponseMessages
    //     .REPLACEMENT_UNDERPRICED;
    //   const alreadyKnownMessage = config.transaction.
    // errors.networkResponseMessages.ALREADY_KNOWN;
    //   const insufficientFundsErrorMessage = config
    //     .transaction.errors.networksInsufficientFundsError[this.chainId]
    //   || config.transaction.errors.networkResponseMessages.INSUFFICIENT_FUNDS;

    //   if (this.retryCount >= this.maxTries) return false;

    //   if (errInString.indexOf(nonceErrorMessage) > -1 ||
    // errInString.indexOf('increasing the gas price or incrementing the nonce') > -1) {
    //     log.info(
    //       `Nonce too low error for relayer ${this.params.rawTransaction.from}
    // on network id ${this.networkId}. Removing nonce from cache and retrying`,
    //     );
    //     this.params.rawTransaction.nonce = await this.network
    //       .getNonce(this.params.rawTransaction.from, true);
    //     log.info(`updating the nonce to ${this.params.rawTransaction.nonce}
    //  for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    //   } else if (errInString.indexOf(replacementFeeLowMessage) > -1) {
    //     log.info(
    //       `Replacement underpriced error for relayer ${this.params.rawTransaction.from}
    //  on network id ${this.networkId}`,
    //     );
    //     let { gasPrice } = await this.network.getGasPrice();

    //     log.info(`gas price from network ${gasPrice}`);
    //     const gasPriceInNumber = ethers.BigNumber.from(
    //       gasPrice.toString(),
    //     ).toNumber();

    //     log.info(`this.params.rawTransaction.gasPrice ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);

    //     if (gasPrice < this.params.rawTransaction.gasPrice) {
    //       gasPrice = this.params.rawTransaction.gasPrice;
    //     }
    //     log.info(`transaction sent with gas price ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    //     log.info(`bump gas price ${config.bumpGasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    //     log.info(`gasPriceInNumber ${gasPriceInNumber} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    //     this.params.rawTransaction.gasPrice = (
    //       gasPriceInNumber * config.bumpGasPrice
    //     ) + gasPriceInNumber;
    //     log.info(`increasing gas price for the resubmit transaction ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    //   } else if (errInString.indexOf(alreadyKnownMessage) > -1) {
    //     log.info(
    //       `Already known transaction hash with same payload and nonce for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}. Removing nonce from cache and retrying`,
    //     );
    //   } else if (errInString.indexOf(insufficientFundsErrorMessage) > -1) {
    //     log.info(`Relayer ${this.params.rawTransaction.from} has insufficient funds`);
    //     // Send previous relayer for funding
    //   } else {
    //     log.info('transaction not being retried');
    //     return false;
    //   }
    // }
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const relayerAddress = account.getPublicKey();
    const {
      to, value, data, gasLimit,
      speed, transactionId, userAddress,
    } = transactionData;

    if (!this.transactionRetryCountMap![transactionId]) {
      this.transactionRetryCountMap![transactionId] = 0;
    } else {
      this.transactionRetryCountMap![transactionId] += 1;
    }
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
      log.info(`Transaction execution response for transactionId: ${JSON.stringify(transactionExecutionResponse)} on chainId ${this.chainId}`);

      log.info(`Incrementing nonce for account: ${relayerAddress} on chainId ${this.chainId}`);
      await this.nonceManager.incrementNonce(relayerAddress);
      log.info(`Incremented nonce for account: ${relayerAddress} on chainId ${this.chainId}`);

      log.info(`Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`);

      const transactionListenerNotifyResponse = await this.transactionListener.notify({
        transactionExecutionResponse,
        transactionId: transactionId as string,
        relayerAddress,
        transactionType,
        previousTransactionHash: null,
        rawTransaction,
        userAddress,
      });

      return {
        state: 'success',
        code: 200,
        transactionId,
        ...transactionListenerNotifyResponse,
      };
    } catch (error) {
      log.info(`Error while sending transaction: ${error}`);
      return {
        state: 'failed',
        code: 500,
        error: JSON.stringify(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }

  async retryTransaction(
    retryTransactionData: RetryTransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const {
      transactionHash,
      transactionId,
      rawTransaction,
      userAddress,
    } = retryTransactionData;
    try {
      // TODO // Make it generel and EIP 1559 specific and get bump up from config
      const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
        rawTransaction.gasPrice as string,
        50,
      );

      rawTransaction.gasPrice = bumpedUpGasPrice as string;
      log.info(`Executing retry transaction for transactionId: ${transactionId}`);
      const retryTransactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        account,
      });

      log.info(`Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`);
      const transactionListenerNotifyResponse = await this.transactionListener.notify({
        transactionExecutionResponse: retryTransactionExecutionResponse,
        transactionId: transactionId as string,
        relayerAddress: account.getPublicKey(),
        rawTransaction,
        transactionType,
        previousTransactionHash: transactionHash,
        userAddress,
      });

      return {
        state: 'success',
        code: 200,
        transactionId,
        ...transactionListenerNotifyResponse,
      };
    } catch (error) {
      log.info(`Error while retrying transaction: ${error} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
      return {
        state: 'failed',
        code: 500,
        error: JSON.stringify(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }
}
