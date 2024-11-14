import { Mutex } from "async-mutex";
import { Hex, TransactionReceipt, decodeFunctionData, toHex } from "viem";
import { estimateGas } from "viem/linea";
import { ENTRY_POINT_ABI } from "entry-point-gas-estimations/dist/gas-estimator/entry-point-v6";
import { ICacheService } from "../../common/cache";
import { IGasPriceService } from "../../common/gas-price";
import { logger } from "../../common/logger";
import { INetworkService } from "../../common/network";
import {
  getMaxRetryCountNotificationMessage,
  getTransactionErrorNotificationMessage,
  getRelayerFundingNotificationMessage,
} from "../../common/notification";
import { INotificationManager } from "../../common/notification/interface";
import {
  EVMRawTransactionType,
  NetworkBasedGasPriceType,
  TransactionType,
  UserOperationStateEnum,
} from "../../common/types";
import {
  getRetryTransactionCountKey,
  getFailedTransactionRetryCountKey,
  parseError,
  customJSONStringify,
} from "../../common/utils";
import { config } from "../../config";
import { STATUSES } from "../../server/api/shared/middleware";
import { IEVMAccount } from "../account";
import { INonceManager } from "../nonce-manager";
import { ITransactionListener } from "../transaction-listener";
import { ITransactionService } from "./interface/ITransactionService";
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ErrorTransactionResponseType,
  EVMTransactionServiceParamsType,
  ExecuteTransactionParamsType,
  ExecuteTransactionResponseType,
  RetryTransactionDataType,
  SuccessTransactionResponseType,
  TransactionDataType,
} from "./types";
import { IUserOperationStateDAO } from "../../common/db";
import { GasPriceType } from "../../common/gas-price/types";
import { BLOCKCHAINS } from "../../common/constants";
import pino from "pino";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMTransactionService
  implements ITransactionService<IEVMAccount, EVMRawTransactionType>
{
  readonly chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType>;

  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;

  gasPriceService: IGasPriceService;

  cacheService: ICacheService;

  notificationManager: INotificationManager;

  userOperationStateDao: IUserOperationStateDAO;

  addressMutex: {
    [address: string]: Mutex;
  } = {};

  constructor(evmTransactionServiceParams: EVMTransactionServiceParamsType) {
    const {
      options,
      networkService,
      transactionListener,
      nonceManager,
      gasPriceService,
      cacheService,
      notificationManager,
      userOperationStateDao,
    } = evmTransactionServiceParams;
    this.chainId = options.chainId;
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

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const relayerAddress = account.getPublicKey();

    const {
      to,
      value,
      data,
      gasLimit,
      speed,
      transactionId,
      walletAddress,
      metaData,
      timestamp,
    } = transactionData;

    const retryTransactionCount = parseInt(
      await this.cacheService.get(
        getRetryTransactionCountKey(transactionId, this.chainId),
      ),
      10,
    );

    const maxRetryCount = 5;

    const _log = log.child({
      transactionId,
      relayerAddress,
      chainId: this.chainId,
      maxRetryCount,
      retryTransactionCount,
    });

    if (retryTransactionCount > maxRetryCount) {
      await this.trySendSlackNotification(
        transactionData,
        account,
        transactionType,
        _log,
      );

      return {
        state: "failed",
        code: STATUSES.NOT_FOUND,
        error:
          "Max retry count exceeded. Use end point to get transaction status",
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }

    _log.info(`Transaction request received`);

    const addressMutex = this.getMutex(account.getPublicKey());

    _log.info(`Taking lock on relayer`);
    const release = await addressMutex.acquire();
    _log.info(`Lock taken on relayer`);

    try {
      // create transaction
      const rawTransaction = await this.createTransaction({
        from: relayerAddress,
        to,
        value,
        data,
        gasLimit,
        speed,
        account,
        transactionId,
      });

      _log.info(
        { rawTransaction },
        `Calling EVMTransactionService.executeTransation`,
      );

      const executeTransactionResponse = await this.executeTransaction(
        {
          rawTransaction,
          account,
        },
        transactionId,
      );

      _log.info(
        {
          executeTransactionResponse,
        },
        `EVMTransactionService.executeTransation responded`,
      );

      if (transactionType === TransactionType.BUNDLER) {
        _log.info(
          `Updating UserOperation state to: ${UserOperationStateEnum.SUBMITTED}`,
        );

        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          transactionHash: executeTransactionResponse.hash,
          state: UserOperationStateEnum.SUBMITTED,
        });
      }

      _log.info(`Incrementing relayer nonce`);
      await this.nonceManager.incrementNonce(relayerAddress);
      _log.info(`Incremented relayer nonce`);

      // release lock once transaction is sent and nonce is incremented
      _log.info(`Releasing lock on relayer`);
      release();
      _log.info(`Lock released on relayer`);

      _log.info(`Calling transactionListener.notify`);

      const transactionListenerNotifyResponse =
        await this.transactionListener.notify({
          transactionHash: executeTransactionResponse.hash,
          transactionId: transactionId as string,
          relayerAddress,
          transactionType,
          previousTransactionHash: undefined,
          rawTransaction,
          walletAddress,
          metaData,
          relayerManagerName,
          timestamp,
        });

      if (transactionType === TransactionType.FUNDING) {
        _log.info(`Funding relayer`);
        await this.sendRelayerFundingSlackNotification(
          relayerAddress,
          this.chainId,
          executeTransactionResponse.hash,
        );
      }

      if (transactionListenerNotifyResponse) {
        return {
          state: "success",
          code: STATUSES.SUCCESS,
          transactionId,
        };
      } else {
        return {
          state: "failed",
          code: STATUSES.WAIT_FOR_TRANSACTION_TIMEOUT,
          error: "waitForTransaction timeout error",
          transactionId,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      _log.info(`Releasing lock on relayer`);
      release();
      _log.info(`Lock released on relayer`);

      if (
        error.message &&
        error.message === "Bundler balance too low. Send bundler for funding"
      ) {
        return {
          state: "failed",
          code: STATUSES.FUND_BUNDLER,
          error: parseError(error),
          transactionId,
          ...{
            isTransactionRelayed: false,
            transactionExecutionResponse: null,
          },
        };
      }

      if (transactionType === TransactionType.BUNDLER) {
        _log.info(
          `Updating UserOperation state to ${UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL}`,
        );
        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          state: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
        });
      }

      _log.info({ err: error }, `Error while sending transaction`);
      await this.sendTransactionFailedSlackNotification(
        transactionId,
        this.chainId,
        parseError(error),
      );
      return {
        state: "failed",
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: parseError(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }

  private async trySendSlackNotification(
    transactionData: TransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
    log: pino.Logger,
  ) {
    try {
      await this.sendMaxRetryCountExceededSlackNotification(
        transactionData.transactionId,
        account,
        transactionType,
        this.chainId,
      );
    } catch (err) {
      log.error({ err }, `Error in sending slack notification`);
    }
  }

  async retryTransaction(
    retryTransactionData: RetryTransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    // TODO: Make it general and EIP 1559 specific and get bump up from config
    const bumpingPercentage = 50;

    const {
      transactionHash,
      transactionId,
      rawTransaction,
      walletAddress,
      metaData,
      relayerManagerName,
      timestamp,
    } = retryTransactionData;

    const _log = log.child({
      transactionId,
      transactionHash,
      chainId: this.chainId,
      walletAddress,
      relayerManagerName,
      bumpingPercentage,
    });

    try {
      await this.cacheService.increment(
        getRetryTransactionCountKey(transactionId, this.chainId),
      );

      let pastGasPrice: NetworkBasedGasPriceType =
        rawTransaction.gasPrice as bigint;
      if (!pastGasPrice) {
        pastGasPrice = {
          maxFeePerGas: rawTransaction.maxFeePerGas as bigint,
          maxPriorityFeePerGas: rawTransaction.maxPriorityFeePerGas as bigint,
        };
      }

      const bumpedUpGasPrice = await this.gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        50,
      );

      _log.info({ bumpedUpGasPrice }, `Bumped up gas price`);

      if (typeof bumpedUpGasPrice === "bigint") {
        rawTransaction.gasPrice = bumpedUpGasPrice as bigint;
      } else if (typeof bumpedUpGasPrice === "object") {
        rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
        rawTransaction.maxPriorityFeePerGas =
          bumpedUpGasPrice.maxPriorityFeePerGas;
      }

      _log.info(`Retry executeTransaction`);

      const retryTransactionExecutionResponse = await this.executeTransaction(
        {
          rawTransaction,
          account,
        },
        transactionId,
      );

      _log.info(
        { retryTransactionExecutionResponse },
        `Retry executeTransaction responded`,
      );

      if (transactionType === TransactionType.BUNDLER) {
        _log.info(
          `Updating UserOperation state to ${UserOperationStateEnum.SUBMITTED}`,
        );
        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          transactionHash: retryTransactionExecutionResponse.hash,
          state: UserOperationStateEnum.SUBMITTED,
        });
      }

      _log.info(`Notifying transaction listener`);

      const transactionListenerNotifyResponse =
        await this.transactionListener.notify({
          transactionHash: retryTransactionExecutionResponse.hash,
          transactionId: transactionId as string,
          relayerAddress: account.getPublicKey(),
          rawTransaction,
          transactionType,
          previousTransactionHash: transactionHash,
          walletAddress,
          metaData,
          relayerManagerName,
          timestamp,
        });

      _log.info(
        { transactionListenerNotifyResponse },
        `Transaction listener responded`,
      );

      if (transactionType === TransactionType.FUNDING) {
        await this.sendRelayerFundingSlackNotification(
          account.getPublicKey(),
          this.chainId,
          transactionHash as string,
        );
      }

      if (transactionListenerNotifyResponse) {
        return {
          state: "success",
          code: STATUSES.SUCCESS,
          transactionId,
        };
      } else {
        return {
          state: "failed",
          code: STATUSES.WAIT_FOR_TRANSACTION_TIMEOUT,
          error: "waitForTransaction timeout error",
          transactionId,
        };
      }
    } catch (error) {
      _log.error({ err: error }, `Error while retrying transaction`);
      log.info(
        `Updating UserOperation state to ${UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL}`,
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

      return {
        state: "failed",
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: parseError(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }

  private async createTransaction(
    createTransactionParams: CreateRawTransactionParamsType,
  ): Promise<CreateRawTransactionReturnType> {
    // create raw transaction basis on data passed
    const { from, to, value, data, gasLimit, speed, account, transactionId } =
      createTransactionParams;
    const relayerAddress = account.getPublicKey();

    const _log = log.child({
      from,
      to,
      value,
      data,
      gasLimit,
      speed,
      relayerAddress,
      transactionId,
      chainId: this.chainId,
    });

    const nonce = await this.nonceManager.getNonce(account);
    _log.info({ nonce }, `Got current nonce`);

    const response = {
      from,
      to,
      value,
      gasLimit,
      data,
      chainId: this.chainId,
      nonce,
    };

    const isLinea = [
      BLOCKCHAINS.LINEA_MAINNET,
      BLOCKCHAINS.LINEA_TESTNET,
    ].includes(this.chainId);

    // Create a 'special' transaction for linea, see method docstring
    if (isLinea) {
      return this.createLineaTransaction(from, data, to, response);
    }

    const gasPrice = await this.gasPriceService.getGasPrice(speed);
    _log.info({ gasPrice }, `getGasPrice responded`);

    if (typeof gasPrice !== "bigint") {
      const { maxPriorityFeePerGas, maxFeePerGas } = gasPrice;
      return {
        ...response,
        type: "eip1559",
        maxFeePerGas: BigInt(maxFeePerGas),
        maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
      };
    }

    return { ...response, type: "legacy", gasPrice: BigInt(gasPrice) };
  }

  // Linea has a custom linea_estimateGas RPC endpoint that we need to call for every transaction
  // and we can't rely on our cached values and standard EVM logic. See: https://docs.linea.build/developers/reference/api/linea-estimategas
  private async createLineaTransaction(
    from: string,
    data: `0x${string}`,
    to: string,
    response: {
      from: string;
      to: `0x${string}`;
      value: bigint;
      gasLimit: `0x${string}`;
      data: `0x${string}`;
      chainId: number;
      nonce: number;
    },
  ) {
    // Note that this estimateGas is imported from viem/linea, it's not standard
    const estimateGasResponse = await estimateGas(
      this.networkService.provider,
      {
        account: from as Hex,
        data: data as Hex,
        to: to as Hex,
      },
    );

    // fixed overhead to cover edge cases, EP uses only 5000 but I added 10x for Linea based on my tests
    let gasLimitOverhead = 50000n;

    // Now we need the verificationGasLimit and callGasLimit from the user op.
    const decodedData = decodeFunctionData({ abi: ENTRY_POINT_ABI, data });
    const firstArg = decodedData.args[0];

    if (Array.isArray(firstArg) && firstArg.length > 0) {
      const userOp = firstArg[0];

      // This is how the EP contract checks if there's enough gas:
      // gasleft() < userOp.callGasLimit + userOp.verificationGasLimit + 5000
      gasLimitOverhead +=
        BigInt(userOp.verificationGasLimit) + BigInt(userOp.callGasLimit);
    }

    const newGasLimit = estimateGasResponse.gasLimit + gasLimitOverhead;
    response.gasLimit = `0x${newGasLimit.toString(16)}`;

    return {
      ...response,
      type: "eip1559",
      maxFeePerGas:
        BigInt(estimateGasResponse.baseFeePerGas) +
        BigInt(estimateGasResponse.priorityFeePerGas),
      maxPriorityFeePerGas: BigInt(
        (estimateGasResponse.priorityFeePerGas * 3n) / 2n,
      ),
    };
  }

  async executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
    transactionId: string,
  ): Promise<ExecuteTransactionResponseType> {
    const retryExecuteTransaction = async (
      retryExecuteTransactionParams: ExecuteTransactionParamsType,
    ): Promise<ExecuteTransactionResponseType> => {
      const { rawTransaction, account } = retryExecuteTransactionParams;
      // TODO: Extract this to config
      const maxFailedTransactionCount = 5;

      const _log = log.child({
        transactionId,
        chainId: this.chainId,
        relayer: account.address,
        maxFailedTransactionCount,
      });
      try {
        _log.info(`Getting failed transaction retry count`);
        const failedTransactionRetryCount = parseInt(
          await this.cacheService.get(
            getFailedTransactionRetryCountKey(transactionId, this.chainId),
          ),
          10,
        );
        _log.info(
          { failedTransactionRetryCount },
          `Got failed transaction retry count`,
        );

        if (failedTransactionRetryCount > maxFailedTransactionCount) {
          throw new Error(
            `Failed transaction retry limit reached for transactionId: ${transactionId}`,
          );
        }

        _log.info(`Calling networkService.sendTransaction`);

        const sendTransactionResponse =
          await this.networkService.sendTransaction(rawTransaction, account);

        _log.info({ sendTransactionResponse }, `Network service responded`);

        if (sendTransactionResponse instanceof Error) {
          _log.error(`Transaction execution failed and checking for retry`);
          throw sendTransactionResponse;
        }

        this.nonceManager.markUsed(
          account.getPublicKey(),
          rawTransaction.nonce,
        );

        return {
          ...rawTransaction,
          hash: sendTransactionResponse,
        };
      } catch (error: unknown) {
        await this.cacheService.increment(
          getFailedTransactionRetryCountKey(transactionId, this.chainId),
          1,
        );
        const errorString = parseError(error).toLowerCase();

        _log.error(
          `Error while executing transaction: ${errorString} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );

        if (isNonceTooLow(errorString)) {
          _log.warn({ errorString }, `Error: Nonce too low`);

          const correctNonce = await this.handleNonceTooLow(account);

          _log.info({ correctNonce }, `Correct nonce is: ${correctNonce}`);
          rawTransaction.nonce = correctNonce;
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (isReplacementTransactionUnderpriced(errorString)) {
          _log.warn(
            { errorString },
            `Error: Replacement transaction underpriced or transaction underpriced`,
          );

          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          if (typeof bumpedUpGasPrice !== "bigint") {
            _log.info(
              {
                maxFeePerGas: rawTransaction.maxFeePerGas,
                maxPriorityFeePeGas: rawTransaction.maxPriorityFeePerGas,
              },
              `Fees per gas before bumping up`,
            );

            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            rawTransaction.maxPriorityFeePerGas =
              bumpedUpGasPrice.maxPriorityFeePerGas;

            _log.info(
              {
                maxFeePerGas: rawTransaction.maxFeePerGas,
                maxPriorityFeePeGas: rawTransaction.maxPriorityFeePerGas,
              },
              `Fees per gas after bumping up`,
            );
          } else {
            _log.info(
              { gasPrice: rawTransaction.gasPrice },
              `Gas price before bumping up`,
            );

            rawTransaction.gasPrice = bumpedUpGasPrice;

            log.info(
              { gasPrice: rawTransaction.gasPrice },
              `Gas price after bumping up`,
            );
          }

          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (isAlreadyKnown(errorString)) {
          // https://github.com/ethereum/go-ethereum/blob/25733a4aadba3b60a9766f1e6ac9c787588ba678/core/txpool/errors.go#L22
          // https://docs.alchemy.com/reference/error-reference
          _log.warn(
            { errorString },
            `Error: Already known transaction hash with same payload and nonce. Not doing anything`,
          );
        } else if (isInsufficientFundsError(errorString)) {
          _log.warn(
            { errorString },
            `Relayer: ${rawTransaction.from} has insufficient funds for transaction`,
          );
          throw new Error("Bundler balance too low. Send bundler for funding");
        } else if (isMaxPriorityFeeHigherThanMaxFee(errorString)) {
          _log.warn(
            { errorString },
            `Error: MaxPriorityFeePerGas higher than MaxFeePerGas`,
          );

          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          if (typeof bumpedUpGasPrice !== "bigint") {
            _log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            _log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
          }
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (isRpcFailure(errorString)) {
          _log.warn(
            { errorString },
            `Error: RPC failure. Retrying transaction.`,
          );
          return retryExecuteTransaction({ rawTransaction, account });
        } else if (isIntrinsicGasTooLow(errorString)) {
          _log.warn(
            { errorString },
            `Error: Intrinsic gas too low. Retrying transaction.`,
          );

          const bumpedUpGasLimit = await this.handleGasTooLow(rawTransaction);
          _log.info(
            { bumpedUpGasLimit },
            `Bumped up gas limits, retrying transaction`,
          );

          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (isMaxFeeBelowBlockBaseFee(errorString)) {
          _log.warn(
            { errorString },
            `Error: MaxFeePerGas below block base fee. Retrying transaction.`,
          );

          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          _log.info(
            { bumpedUpGasPrice },
            `Bumped up gas price, retrying transaction`,
          );

          if (typeof bumpedUpGasPrice !== "bigint") {
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
          }
          return await retryExecuteTransaction({ rawTransaction, account });
        } else {
          _log.error(
            {
              errorString,
              errorRaw: error,
            },
            `Critical: don't know how to handle error. Transaction not being retried`,
          );
          throw new Error(errorString);
        }

        throw new Error(errorString);
      }
    };

    return retryExecuteTransaction(executeTransactionParams);
  }

  /**
   * cancelTransaction cancels the pending transaction for the given account & nonce
   * @param account IEVMAccount
   * @param nonce number
   * @returns Receipt or error
   */
  async cancelTransaction(
    account: IEVMAccount,
    nonce: number,
  ): Promise<TransactionReceipt> {
    const relayerAddress = account.getPublicKey();
    log.info(
      `Cancel transaction request received for relayerAddress: ${relayerAddress} for nonce=${nonce} on chainId: ${this.chainId}`,
    );

    const addressMutex = this.getMutex(account.getPublicKey());
    log.info(
      `Taking lock on address: ${account.getPublicKey()} to cancel transaction for relayerAddress: ${relayerAddress} for nonce: ${nonce} on chainId: ${
        this.chainId
      }`,
    );
    const release = await addressMutex.acquire();

    try {
      const gasPrice = await this.gasPriceService.getGasPrice(
        GasPriceType.FAST,
      );
      let gasParams:
        | { type: "legacy"; gasPrice: bigint }
        | {
            type: "eip1559";
            maxFeePerGas: bigint;
            maxPriorityFeePerGas: bigint;
          };
      if (typeof gasPrice !== "bigint") {
        log.info(
          `Gas price being used to cancel transaction by relayer: ${relayerAddress} for nonce: ${nonce} is: ${customJSONStringify(
            gasPrice,
          )} on chainId: ${this.chainId}`,
        );
        const { maxPriorityFeePerGas, maxFeePerGas } = gasPrice;
        gasParams = {
          type: "eip1559",
          maxFeePerGas: BigInt(maxFeePerGas),
          maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
        };
      } else {
        gasParams = { type: "legacy", gasPrice: BigInt(gasPrice) };
      }

      const rawCancelTransaction: EVMRawTransactionType = {
        from: relayerAddress,
        to: relayerAddress as `0x${string}`,
        value: BigInt(0),
        data: "0x",
        nonce,
        gasLimit: toHex(21000),
        chainId: this.chainId,
        ...gasParams,
      };

      const cancelTransactionResponse =
        await this.networkService.sendTransaction(
          rawCancelTransaction,
          account,
        );

      log.info(
        `Cancel transaction txHash: ${cancelTransactionResponse} for relayerAddress=${relayerAddress} and nonce: ${nonce} on chainId: ${this.chainId}`,
      );

      const receipt = await this.networkService.waitForTransaction(
        cancelTransactionResponse as string,
        "ADMIN_CANCEL",
      );

      release();

      return receipt;
    } catch (err: unknown) {
      release();
      throw err;
    }
  }

  private async handleNonceTooLow(account: IEVMAccount) {
    const correctNonce = await this.nonceManager.getAndSetNonceFromNetwork(
      account,
      true,
    );
    return correctNonce;
  }

  private async handleReplacementFeeTooLow(
    rawTransaction: EVMRawTransactionType,
  ) {
    const pastGasPrice = rawTransaction.gasPrice
      ? rawTransaction.gasPrice
      : {
          maxFeePerGas: rawTransaction.maxFeePerGas,
          maxPriorityFeePerGas: rawTransaction.maxPriorityFeePerGas,
        };
    const bumpedUpGasPrice = await this.gasPriceService.getBumpedUpGasPrice(
      pastGasPrice as NetworkBasedGasPriceType,
      50,
    );
    return bumpedUpGasPrice;
  }

  private async handleGasTooLow(rawTransaction: EVMRawTransactionType) {
    return toHex(Number(rawTransaction.gasLimit) * 2);
  }

  private async sendMaxRetryCountExceededSlackNotification(
    transactionId: string,
    account: IEVMAccount,
    transactionType: TransactionType,
    chainId: number,
  ) {
    const maxRetryCountNotificationMessage =
      getMaxRetryCountNotificationMessage(
        transactionId,
        account,
        transactionType,
        chainId,
      );
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
function isMaxFeeBelowBlockBaseFee(errorString: string) {
  return MAX_FEE_PER_GAS_LESS_THAN_BLOCK_BASE_FEE.some(
    (str) => errorString.indexOf(str) > -1,
  );
}

function isIntrinsicGasTooLow(errorString: string) {
  return INTRINSIC_GAS_TOO_LOW.some((str) => errorString.indexOf(str) > -1);
}

function isRpcFailure(errorString: string) {
  return RPC_FAILURE.some((str) => errorString.indexOf(str) > -1);
}

function isMaxPriorityFeeHigherThanMaxFee(errorString: string) {
  return MAX_PRIORITY_FEE_HIGHER_THAN_MAX_FEE.some(
    (str) => errorString.indexOf(str) > -1,
  );
}

function isInsufficientFundsError(errorString: string) {
  return INSUFFICIENT_FUNDS.some((str) => errorString.indexOf(str) > -1);
}

function isAlreadyKnown(errorString: string) {
  return ALREADY_KNOWN.some((str) => errorString.indexOf(str) > -1);
}

function isReplacementTransactionUnderpriced(errInString: string) {
  return (
    REPLACEMENT_TRANSACTION_UNDERPRICED.some(
      (str) => errInString.indexOf(str) > -1,
    ) || TRANSACTION_UNDERPRICED.some((str) => errInString.indexOf(str) > -1)
  );
}

function isNonceTooLow(errInString: string) {
  return NONCE_TOO_LOW.some((str) => errInString.indexOf(str) > -1);
}

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
