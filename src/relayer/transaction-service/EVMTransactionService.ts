/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-else-return */
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

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMTransactionService
  implements ITransactionService<IEVMAccount, EVMRawTransactionType>
{
  chainId: number;

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
    } = transactionData;

    const retryTransactionCount = parseInt(
      await this.cacheService.get(
        getRetryTransactionCountKey(transactionId, this.chainId),
      ),
      10,
    );

    const maxRetryCount = 5;

    // TODO: Here is where we can add the logic to cancel the transaction automatically sometimes

    if (retryTransactionCount > maxRetryCount) {
      try {
        // send slack notification
        await this.sendMaxRetryCountExceededSlackNotification(
          transactionData.transactionId,
          account,
          transactionType,
          this.chainId,
        );
      } catch (error) {
        log.error(`Error in sending slack notification: ${parseError(error)}`);
      }
      return {
        state: "failed",
        code: STATUSES.NOT_FOUND,
        error:
          "Max retry count exceeded. Use end point to get transaction status", // todo add end point
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
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
      log.info(
        `Raw transaction for transactionId: ${transactionId} is ${customJSONStringify(
          rawTransaction,
        )} on chainId ${this.chainId}`,
      );

      const transactionExecutionResponse = await this.executeTransaction(
        {
          rawTransaction,
          account,
        },
        transactionId,
      );

      log.info(
        `Transaction execution response for transactionId ${
          transactionData.transactionId
        }: ${customJSONStringify(transactionExecutionResponse)} on chainId ${
          this.chainId
        }`,
      );

      if (transactionType === TransactionType.BUNDLER) {
        log.info(
          `Setting: ${UserOperationStateEnum.SUBMITTED} for transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          transactionHash: transactionExecutionResponse.hash,
          state: UserOperationStateEnum.SUBMITTED,
        });
      }

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
      const transactionListenerNotifyResponse =
        await this.transactionListener.notify({
          transactionHash: transactionExecutionResponse.hash,
          transactionId: transactionId as string,
          relayerAddress,
          transactionType,
          previousTransactionHash: undefined,
          rawTransaction,
          walletAddress,
          metaData,
          relayerManagerName,
        });

      if (transactionType === TransactionType.FUNDING) {
        await this.sendRelayerFundingSlackNotification(
          relayerAddress,
          this.chainId,
          transactionExecutionResponse.hash,
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
        log.info(
          `Setting: ${UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL} for transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          state: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
        });
      }
      log.info(
        `Error while sending transaction: ${error} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
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

  async retryTransaction(
    retryTransactionData: RetryTransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const {
      transactionHash,
      transactionId,
      rawTransaction,
      walletAddress,
      metaData,
      relayerManagerName,
    } = retryTransactionData;
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
      // Make it general and EIP 1559 specific and get bump up from config
      const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        50,
      );
      log.info(
        `Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`,
      );

      if (typeof bumpedUpGasPrice === "bigint") {
        rawTransaction.gasPrice = bumpedUpGasPrice as bigint;
        log.info(
          `Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`,
        );
      } else if (typeof bumpedUpGasPrice === "object") {
        rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
        rawTransaction.maxPriorityFeePerGas =
          bumpedUpGasPrice.maxPriorityFeePerGas;
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
          rawTransaction,
        )} on chainId ${this.chainId}`,
      );

      const retryTransactionExecutionResponse = await this.executeTransaction(
        {
          rawTransaction,
          account,
        },
        transactionId,
      );
      if (transactionType === TransactionType.BUNDLER) {
        log.info(
          `Setting: ${UserOperationStateEnum.SUBMITTED} for transactionId: ${transactionId} for resubmitted transaction on chainId ${this.chainId}`,
        );
        this.userOperationStateDao.updateState(this.chainId, {
          transactionId,
          transactionHash: retryTransactionExecutionResponse.hash,
          state: UserOperationStateEnum.SUBMITTED,
        });
      }

      log.info(
        `Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
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
        });

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

    const nonce = await this.nonceManager.getNonce(relayerAddress);
    log.info(
      `Nonce for relayerAddress ${relayerAddress} is ${nonce} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );

    log.info(
      `Nonce for relayerAddress ${relayerAddress} is ${nonce} for transactionId: ${transactionId}`,
      this.chainId,
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

    const isLinea = [
      BLOCKCHAINS.LINEA_MAINNET,
      BLOCKCHAINS.LINEA_TESTNET,
    ].includes(this.chainId);

    // Create a 'special' transaction for linea, see method docstring
    if (isLinea) {
      return this.createLineaTransaction(from, data, to, response);
    }

    const gasPrice = await this.gasPriceService.getGasPrice(speed);
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
      };
    }
    log.info(
      `Gas price being used to send transaction by relayer: ${relayerAddress} is: ${gasPrice} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );
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
        const sendTransactionResponse =
          await this.networkService.sendTransaction(rawTransaction, account);
        log.info(
          `Send transaction response: ${customJSONStringify(
            sendTransactionResponse,
          )} for bundler address: ${
            rawTransaction.from
          } for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        if (sendTransactionResponse instanceof Error) {
          log.info(
            `Transaction execution failed and checking for retry for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
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
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (
          REPLACEMENT_TRANSACTION_UNDERPRICED.some(
            (str) => errInString.indexOf(str) > -1,
          ) ||
          TRANSACTION_UNDERPRICED.some((str) => errInString.indexOf(str) > -1)
        ) {
          log.info(
            `Replacement transaction underpriced or transaction underpriced error for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          if (typeof bumpedUpGasPrice !== "bigint") {
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            log.info(
              `rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            rawTransaction.maxPriorityFeePerGas =
              bumpedUpGasPrice.maxPriorityFeePerGas;
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
            log.info(
              `rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
          } else {
            log.info(
              `rawTransaction.gasPrice ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            rawTransaction.gasPrice = bumpedUpGasPrice;
            log.info(
              `increasing gas price for the resubmit transaction ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
          }

          return await retryExecuteTransaction({ rawTransaction, account });
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
          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          if (typeof bumpedUpGasPrice !== "bigint") {
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
          }
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (RPC_FAILURE.some((str) => errInString.indexOf(str) > -1)) {
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (
          INTRINSIC_GAS_TOO_LOW.some((str) => errInString.indexOf(str) > -1)
        ) {
          const bumpedUpGasLimit = await this.handleGasTooLow(rawTransaction);

          log.info(
            `rawTransaction.gasLimit ${rawTransaction.gasLimit} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
          );
          rawTransaction.gasLimit = bumpedUpGasLimit;
          log.info(
            `increasing gas limit for the resubmit transaction ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
          log.info(
            `rawTransaction.gasLimit ${rawTransaction.gasLimit} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
          );
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (
          MAX_FEE_PER_GAS_LESS_THAN_BLOCK_BASE_FEE.some(
            (str) => errInString.indexOf(str) > -1,
          )
        ) {
          const bumpedUpGasPrice =
            await this.handleReplacementFeeTooLow(rawTransaction);

          if (typeof bumpedUpGasPrice !== "bigint") {
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} before bumping up`,
            );
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            log.info(
              `increasing gas price for the resubmit transaction ${rawTransaction.gasPrice} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            log.info(
              `rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId} after bumping up`,
            );
          }
          return await retryExecuteTransaction({ rawTransaction, account });
        } else {
          log.info(
            `Error: ${errInString} not handled. Transaction not being retried for bundler address: ${rawTransaction.from} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
          throw new Error(errInString);
        }
        throw new Error(errInString);
      }
    };

    const response = await retryExecuteTransaction(executeTransactionParams);
    return response;
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
    } catch (err: any) {
      release();
      throw err;
    }
  }

  private async handleNonceTooLow(rawTransaction: EVMRawTransactionType) {
    const correctNonce = await this.nonceManager.getAndSetNonceFromNetwork(
      rawTransaction.from,
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
    const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
      pastGasPrice as NetworkBasedGasPriceType,
      50,
    );
    return bumpedUpGasPrice;
  }

  // eslint-disable-next-line class-methods-use-this
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
