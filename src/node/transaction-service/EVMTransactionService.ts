/* eslint-disable no-param-reassign */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-else-return */
import { Mutex } from "async-mutex";
import { ICacheService } from "../../common/cache";
import { IGasPriceService } from "../../common/gas-price";
import { logger } from "../../common/logger";
import {
  getMaxRetryCountNotificationMessage,
  getTransactionErrorNotificationMessage,
  getRelayerFundingNotificationMessage,
} from "../../common/notification";
import { INotificationManager } from "../../common/notification/interface";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
  isEVM1559RawTransaction,
  isEVMLegacyRawTransaction,
  UserOperationStateEnum,
} from "../../common/types";
import {
  getRetryTransactionCountKey,
  getFailedTransactionRetryCountKey,
  parseError,
  customJSONStringify,
} from "../../common/utils";
import { config } from "../../common/config";
import { IEVMAccount } from "../account";
import { INonceManager } from "../nonce-manager";
import { ITransactionListener } from "../transaction-listener";
import { ITransactionService } from "./interface/ITransactionService";
import { EVMTransactionServiceParamsType } from "./types";
import { IUserOperationStateDAO } from "../../common/db";
import { INetworkService } from "../network";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMTransactionService
  implements
    ITransactionService<
      IEVMAccount,
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >
{
  chainId: number;

  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  transactionListener: ITransactionListener<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  nonceManager: INonceManager<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  gasPriceService: IGasPriceService;

  cacheService: ICacheService;

  notificationManager: INotificationManager;

  userOperationStateDao: IUserOperationStateDAO;

  addressMutex: {
    [address: string]: Mutex;
  } = {};

  constructor(evmTransactionServiceParams: EVMTransactionServiceParamsType) {
    const {
      networkService,
      transactionListener,
      nonceManager,
      gasPriceService,
      cacheService,
      notificationManager,
      userOperationStateDao,
    } = evmTransactionServiceParams;
    this.chainId = networkService.chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;
    this.gasPriceService = gasPriceService;
    this.cacheService = cacheService;
    this.notificationManager = notificationManager;
    this.userOperationStateDao = userOperationStateDao;
  }

  private getMutex(address: string) {
    if (!this.addressMutex[address]) {
      this.addressMutex[address] = new Mutex();
    }
    return this.addressMutex[address];
  }

  async relayTransaction(
    partialRawTransaction: Partial<
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    transactionId: string,
    account: IEVMAccount,
  ): Promise<void> {
    const relayerAddress = account.getPublicKey();

    const { to, value, data, gasLimit } = partialRawTransaction;

    const retryTransactionCount = parseInt(
      await this.cacheService.get(
        getRetryTransactionCountKey(transactionId, this.chainId),
      ),
      10,
    );

    const maxRetryCount = 5;

    if (retryTransactionCount > maxRetryCount) {
      try {
        // send slack notification
        await this.sendMaxRetryCountExceededSlackNotification(
          transactionId,
          account,
          this.chainId,
        );
      } catch (error) {
        log.error(`Error in sending slack notification: ${parseError(error)}`);
      }
      // TODO throw this error
      // return {
      //   state: "failed",
      //   code: STATUSES.NOT_FOUND,
      //   error:
      //     "Max retry count exceeded. Use end point to get transaction status", // todo add end point
      //   transactionId,
      //   ...{
      //     isTransactionRelayed: false,
      //     transactionExecutionResponse: null,
      //   },
      // };
    }

    log.info(
      `Transaction request received for transactionId: ${transactionId} on chainId ${this.chainId}`,
    );

    const addressMutex = this.getMutex(account.getPublicKey());
    log.info(
      `Taking lock on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
        this.chainId
      }`,
    );
    const release = await addressMutex.acquire();
    log.info(
      `Lock taken on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
        this.chainId
      }`,
    );

    try {
      // create transaction
      const rawTransaction = await this.createFullRawTransaction(
        {
          from: relayerAddress as `0x${string}`,
          to,
          value,
          data,
          gasLimit,
        },
        account,
        transactionId,
      );
      log.info(
        `Raw transaction for transactionId: ${transactionId} is ${customJSONStringify(
          rawTransaction,
        )} on chainId ${this.chainId}`,
      );

      const transactionHash = await this.executeTransactionWithRetry(
        rawTransaction,
        account,
        transactionId,
      );

      log.info(
        `Transaction execution response for transactionId ${transactionId}: ${customJSONStringify(transactionHash)} on chainId ${
          this.chainId
        }`,
      );

      log.info(
        `Setting: ${UserOperationStateEnum.SUBMITTED} for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      this.userOperationStateDao.updateState(this.chainId, {
        transactionId,
        transactionHash,
        state: UserOperationStateEnum.SUBMITTED,
      });

      log.info(
        `Incrementing nonce for account: ${relayerAddress} for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      await this.nonceManager.incrementNonce(relayerAddress);
      log.info(
        `Incremented nonce for account: ${relayerAddress} for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );

      // release lock once transaction is sent and nonce is incremented
      log.info(
        `Releasing lock on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );
      release();
      log.info(
        `Lock released on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );

      log.info(
        `Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );

      await this.transactionListener.notify({
        transactionHash,
        transactionId,
        relayerAddress,
        previousTransactionHash: undefined,
        rawTransaction,
      });

      if (
        rawTransaction.from.toLowerCase() ===
        config.relayerManager.ownerAddress.toLowerCase()
      ) {
        await this.sendRelayerFundingSlackNotification(
          relayerAddress,
          this.chainId,
          transactionHash,
        );
      }

      // TODO throw error
      // if (transactionListenerNotifyResponse) {
      //   return {
      //     state: "success",
      //     code: STATUSES.SUCCESS,
      //     transactionId,
      //   };
      // } else {
      //   return {
      //     state: "failed",
      //     code: STATUSES.WAIT_FOR_TRANSACTION_TIMEOUT,
      //     error: "waitForTransaction timeout error",
      //     transactionId,
      //   };
      // }
    } catch (error: any) {
      log.info(
        `Releasing lock on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );
      release();
      log.info(
        `Lock released on address: ${account.getPublicKey()} for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );
      if (
        error.message &&
        error.message === "Bundler balance too low. Send bundler for funding"
      ) {
        // TODO throw error
        // return {
        //   state: "failed",
        //   code: STATUSES.FUND_BUNDLER,
        //   error: parseError(error),
        //   transactionId,
        //   ...{
        //     isTransactionRelayed: false,
        //     transactionExecutionResponse: null,
        //   },
        // };
      }
      log.info(
        `Setting: ${UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL} for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      this.userOperationStateDao.updateState(this.chainId, {
        transactionId,
        state: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
      });

      log.info(
        `Error while sending transaction: ${error} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      await this.sendTransactionFailedSlackNotification(
        transactionId,
        this.chainId,
        parseError(error),
      );
    }
  }

  async retryTransaction(
    partialRawTransaction: Partial<
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    transactionId: string,
    account: IEVMAccount,
    previousTransactionHash: `0x${string}`,
  ): Promise<void> {
    try {
      await this.cacheService.increment(
        getRetryTransactionCountKey(transactionId, this.chainId),
      );

      if (isEVM1559RawTransaction(partialRawTransaction)) {
        const pastGasPrice = {
          maxFeePerGas: partialRawTransaction.maxFeePerGas,
          maxPriorityFeePerGas: partialRawTransaction.maxPriorityFeePerGas,
        };

        const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
          pastGasPrice,
          50,
        ) as {
          maxPriorityFeePerGas: bigint;
          maxFeePerGas: bigint;
        };
        log.info(
          `Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`,
        );

        partialRawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
        partialRawTransaction.maxPriorityFeePerGas =
          bumpedUpGasPrice.maxPriorityFeePerGas;
        log.info(
          `Bumped up gas price for transactionId: ${transactionId} is ${customJSONStringify(
            bumpedUpGasPrice,
          )} on chainId ${this.chainId}`,
        );
      } else if (isEVMLegacyRawTransaction(partialRawTransaction)) {
        const pastGasPrice = partialRawTransaction.gasPrice;

        const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
          pastGasPrice,
          50,
        ) as bigint;

        log.info(
          `Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`,
        );

        partialRawTransaction.gasPrice = bumpedUpGasPrice;

        log.info(
          `Bumped up gas price for transactionId: ${transactionId} is ${customJSONStringify(
            bumpedUpGasPrice,
          )} on chainId ${this.chainId}`,
        );
      }

      log.info(
        `Executing retry transaction for transactionId: ${transactionId}`,
      );
      log.info(
        `Raw transaction for retrying transactionId: ${transactionId} is ${customJSONStringify(
          partialRawTransaction,
        )} on chainId ${this.chainId}`,
      );

      const newTransactionHash = await this.executeTransactionWithRetry(
        partialRawTransaction as
          | EVM1559RawTransaction
          | EVMLegacyRawTransaction,
        account,
        transactionId,
      );
      log.info(
        `Setting: ${UserOperationStateEnum.SUBMITTED} for transactionId: ${transactionId} for resubmitted transaction on chainId ${this.chainId}`,
      );
      this.userOperationStateDao.updateState(this.chainId, {
        transactionId,
        transactionHash: newTransactionHash,
        state: UserOperationStateEnum.SUBMITTED,
      });

      log.info(
        `Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      await this.transactionListener.notify({
        transactionHash: newTransactionHash,
        transactionId,
        relayerAddress: account.getPublicKey(),
        rawTransaction: partialRawTransaction as
          | EVM1559RawTransaction
          | EVMLegacyRawTransaction,
        previousTransactionHash,
      });

      if (
        (partialRawTransaction.from as `0x${string}`).toLowerCase() ===
        config.relayerManager.ownerAddress.toLowerCase()
      ) {
        await this.sendRelayerFundingSlackNotification(
          account.getPublicKey(),
          this.chainId,
          newTransactionHash,
        );
      }

      // if (transactionListenerNotifyResponse) {
      //   return {
      //     state: "success",
      //     code: STATUSES.SUCCESS,
      //     transactionId,
      //   };
      // } else {
      //   return {
      //     state: "failed",
      //     code: STATUSES.WAIT_FOR_TRANSACTION_TIMEOUT,
      //     error: "waitForTransaction timeout error",
      //     transactionId,
      //   };
      // }
    } catch (error) {
      log.error(
        `Error while retrying transaction: ${parseError(
          error,
        )} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      log.info(
        `Setting: ${UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL} for transactionId: ${transactionId} for resubmitted transaction on chainId ${this.chainId}`,
      );
      this.userOperationStateDao.updateState(this.chainId, {
        transactionId,
        state: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
      });
      await this.sendTransactionFailedSlackNotification(
        transactionId,
        this.chainId,
        parseError(error),
      );
      // TODO throw error
      // return {
      //   state: "failed",
      //   code: STATUSES.INTERNAL_SERVER_ERROR,
      //   error: parseError(error),
      //   transactionId,
      //   ...{
      //     isTransactionRelayed: false,
      //     transactionExecutionResponse: null,
      //   },
      // };
    }
  }

  private async createFullRawTransaction(
    partialRawTransaction: Partial<
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    account: IEVMAccount,
    transactionId: string,
  ): Promise<EVM1559RawTransaction | EVMLegacyRawTransaction> {
    // create raw transaction basis on data passed
    const { from, to, value, data, gasLimit } = partialRawTransaction;
    const relayerAddress = account.getPublicKey();

    const nonce = await this.nonceManager.getNonce(relayerAddress);
    log.info(
      `Nonce for relayerAddress ${relayerAddress} is ${nonce} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );
    const response = {
      from,
      to,
      value,
      gasLimit,
      data,
      chainId: this.chainId,
      nonce,
    };
    const gasPrice = await this.gasPriceService.getGasPrice();
    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price being used to send transaction by relayer: ${relayerAddress} is: ${customJSONStringify(
          gasPrice,
        )} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      const { maxPriorityFeePerGas, maxFeePerGas } = gasPrice;
      return {
        ...response,
        type: "eip1559",
        maxFeePerGas: BigInt(maxFeePerGas),
        maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
      } as EVM1559RawTransaction;
    }
    log.info(
      `Gas price being used to send transaction by relayer: ${relayerAddress} is: ${gasPrice} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );
    return {
      ...response,
      type: "legacy",
      gasPrice: BigInt(gasPrice),
    } as EVMLegacyRawTransaction;
  }

  async executeTransactionWithRetry(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
    account: IEVMAccount,
    transactionId: string,
  ): Promise<`0x${string}`> {
    try {
      log.info(
        `Getting failed transaction retry count for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      const failedTransactionRetryCount = parseInt(
        await this.cacheService.get(
          getFailedTransactionRetryCountKey(transactionId, this.chainId),
        ),
        10,
      );

      const maxFailedTransactionCount = 5;

      if (failedTransactionRetryCount > maxFailedTransactionCount) {
        throw new Error(
          `Failed transaction retry limit reached for transactionId: ${transactionId}`,
        );
      }

      log.info(
        `Sending transaction to network: ${customJSONStringify(
          rawTransaction,
        )} for bundler address: ${
          rawTransaction.from
        } for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      const sendTransactionResponse = await this.networkService.sendTransaction(
        rawTransaction,
        account,
      );
      log.info(
        `Send transaction response: ${customJSONStringify(
          sendTransactionResponse,
        )} for bundler address: ${
          rawTransaction.from
        } for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      this.nonceManager.markUsed(account.getPublicKey(), rawTransaction.nonce);
      return sendTransactionResponse;
    } catch (error: any) {
      await this.cacheService.increment(
        getFailedTransactionRetryCountKey(transactionId, this.chainId),
        1,
      );
      const errInString = parseError(error).toLowerCase();
      log.error(
        `Error while executing transaction: ${errInString} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      const {
        ALREADY_KNOWN,
        REPLACEMENT_TRANSACTION_UNDERPRICED,
        TRANSACTION_UNDERPRICED,
        INSUFFICIENT_FUNDS,
        NONCE_TOO_LOW,
        MAX_PRIORITY_FEE_HIGHER_THAN_MAX_FEE,
        RPC_FAILURE,
        INTRINSIC_GAS_TOO_LOW,
        MAX_FEE_PER_GAS_LESS_THAN_BLOCK_BASE_FEE,
      } = config.transaction.rpcResponseErrorMessages;

      if (NONCE_TOO_LOW.some((str) => errInString.indexOf(str) > -1)) {
        log.info(
          `Nonce too low error for for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        const correctNonce = await this.handleNonceTooLow(rawTransaction);
        log.info(
          `Correct nonce to be used: ${correctNonce} for for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        rawTransaction.nonce = correctNonce;
        return await this.executeTransactionWithRetry(rawTransaction, account, transactionId);
      } else if (
        REPLACEMENT_TRANSACTION_UNDERPRICED.some(
          (str) => errInString.indexOf(str) > -1,
        ) ||
        TRANSACTION_UNDERPRICED.some((str) => errInString.indexOf(str) > -1)
        ||         MAX_FEE_PER_GAS_LESS_THAN_BLOCK_BASE_FEE.some(
          (str) => errInString.indexOf(str) > -1,
        )
      ) {
        log.info(
          `Replacement transaction underpriced or transaction underpriced error for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        const newRawTransaction = await this.handleReplacementFeeTooLow(
          rawTransaction,
          transactionId,
        );

        return await this.executeTransactionWithRetry(
          newRawTransaction,
          account,
          transactionId
        );
      } else if (ALREADY_KNOWN.some((str) => errInString.indexOf(str) > -1)) {
        log.info(
          `Already known transaction hash with same payload and nonce for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}. Not doing anything`,
        );
        // https://github.com/ethereum/go-ethereum/blob/25733a4aadba3b60a9766f1e6ac9c787588ba678/core/txpool/errors.go#L22
        // https://docs.alchemy.com/reference/error-reference
      } else if (
        INSUFFICIENT_FUNDS.some((str) => errInString.indexOf(str) > -1)
      ) {
        log.info(
          `Bundler address: ${rawTransaction.from} has insufficient funds for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        throw new Error("Bundler balance too low. Send bundler for funding");
      } else if (
        MAX_PRIORITY_FEE_HIGHER_THAN_MAX_FEE.some(
          (str) => errInString.indexOf(str) > -1,
        )
      ) {
        const newRawTransaction = await this.handleReplacementFeeTooLow(
          rawTransaction,
          transactionId,
        );

        // replace the max priority fee back as we don't need to update that
        (newRawTransaction as EVM1559RawTransaction).maxPriorityFeePerGas = (rawTransaction as EVM1559RawTransaction).maxPriorityFeePerGas;

        return await this.executeTransactionWithRetry(
          newRawTransaction,
          account,
          transactionId
        );
      } else if (RPC_FAILURE.some((str) => errInString.indexOf(str) > -1)) {
        return await this.executeTransactionWithRetry(rawTransaction, account, transactionId);
      } else if (
        INTRINSIC_GAS_TOO_LOW.some((str) => errInString.indexOf(str) > -1)
      ) {
        const bumpedUpGasLimit = await this.handleGasTooLow(rawTransaction);

        log.info(
          `rawTransaction.gasLimit ${rawTransaction.gasLimit} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
        );
        rawTransaction.gasLimit = bumpedUpGasLimit;
        log.info(
          `increasing gas limit for the resubmit transaction ${rawTransaction.gasLimit} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        log.info(
          `rawTransaction.gasLimit ${rawTransaction.gasLimit} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
        );
        return await this.executeTransactionWithRetry(rawTransaction, account, transactionId);
      } else {
        log.info(
          `Error: ${errInString} not handled. Transaction not being retried for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        throw new Error(errInString);
      }
      throw new Error(errInString);
    }
  }

  private async handleNonceTooLow(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ) {
    const correctNonce = await this.nonceManager.getAndSetNonceFromNetwork(
      rawTransaction.from,
      true,
    );
    return correctNonce;
  }

  private async handleReplacementFeeTooLow(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
    transactionId: string,
  ) {
    if (isEVM1559RawTransaction(rawTransaction)) {
      log.info(
        `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
      );
      log.info(
        `rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
      );

      const pastGasPrice = {
        maxFeePerGas: rawTransaction.maxFeePerGas,
        maxPriorityFeePerGas: rawTransaction.maxPriorityFeePerGas,
      };
      const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        50,
      ) as {
        maxPriorityFeePerGas: bigint;
        maxFeePerGas: bigint;
      };
      rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
      rawTransaction.maxPriorityFeePerGas =
        bumpedUpGasPrice.maxPriorityFeePerGas;
      log.info(
        `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
      );
      log.info(
        `rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
      );
    } else if (isEVMLegacyRawTransaction(rawTransaction)) {
      log.info(
        `rawTransaction.gasPrice ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
      );
      const pastGasPrice = rawTransaction.gasPrice;
      rawTransaction.gasPrice = this.gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        50,
      ) as bigint;
      log.info(
        `increasing gas price for the resubmit transaction ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
      );
    }
    return rawTransaction;
  }

  // eslint-disable-next-line class-methods-use-this
  private async handleGasTooLow(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ) {
    return rawTransaction.gasLimit * 2n;
  }

  private async sendMaxRetryCountExceededSlackNotification(
    transactionId: string,
    account: IEVMAccount,
    chainId: number,
  ) {
    const maxRetryCountNotificationMessage =
      getMaxRetryCountNotificationMessage(transactionId, account, chainId);
    const slackNotifyObject = this.notificationManager.getSlackNotifyObject(
      maxRetryCountNotificationMessage,
    );
    await this.notificationManager.sendSlackNotification(slackNotifyObject);
  }

  private async sendTransactionFailedSlackNotification(
    transactionId: string,
    chainId: number,
    error: string,
  ) {
    try {
      const message = getTransactionErrorNotificationMessage(
        transactionId,
        chainId,
        error,
      );
      const slackNotifyObject =
        this.notificationManager.getSlackNotifyObject(message);
      await this.notificationManager.sendSlackNotification(slackNotifyObject);
    } catch (errorInSlack) {
      log.error(
        `Error in sending slack notification: ${parseError(errorInSlack)}`,
      );
    }
  }

  private async sendRelayerFundingSlackNotification(
    relayerAddress: string,
    chainId: number,
    transactionHash: string,
  ) {
    try {
      const message = getRelayerFundingNotificationMessage(
        relayerAddress,
        chainId,
        transactionHash,
      );
      const slackNotifyObject =
        this.notificationManager.getSlackNotifyObject(message);
      await this.notificationManager.sendSlackNotification(slackNotifyObject);
    } catch (errorInSlack) {
      log.error(
        `Error in sending slack notification: ${parseError(errorInSlack)}`,
      );
    }
  }
}
