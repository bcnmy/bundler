import { TransactionReceipt, decodeErrorResult, toHex } from "viem";
import { ICacheService } from "../../common/cache";
import {
  ITransactionDAO,
  IUserOperationDAO,
  IUserOperationStateDAO,
  IUserOperationV07DAO,
} from "../../common/db";
import { IQueue } from "../../common/interface";
import { logger } from "../../common/logger";
import { INetworkService } from "../../common/network";
import { RetryTransactionQueueData } from "../../common/queue/types";
import {
  EntryPointContractType,
  EntryPointMapType,
  EntryPointV07ContractType,
  EntryPointV07MapType,
  EVMRawTransactionType,
  TransactionStatus,
  TransactionType,
  UserOperationStateEnum,
} from "../../common/types";
import {
  getRetryTransactionCountKey,
  getTokenPriceKey,
  getTransactionMinedKey,
  parseError,
  getUserOperationReceiptForFailedTransaction,
  getUserOperationReceiptForSuccessfulTransaction,
  customJSONStringify,
  convertBigIntToString,
} from "../../common/utils";
import { IEVMAccount } from "../account";
import { ITransactionListener } from "./interface/ITransactionListener";
import {
  EVMTransactionListenerParamsType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
} from "./types";
import { config } from "../../config";
import { FlashbotsTxStatus } from "../../common/network/FlashbotsClient";
import pino from "pino";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMTransactionListener
  implements ITransactionListener<IEVMAccount, EVMRawTransactionType>
{
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  retryTransactionQueue: IQueue<RetryTransactionQueueData>;

  transactionDao: ITransactionDAO;

  userOperationDao: IUserOperationDAO;

  userOperationDaoV07: IUserOperationV07DAO;

  userOperationStateDao: IUserOperationStateDAO;

  entryPointMap: EntryPointMapType;

  entryPointV07Map: EntryPointV07MapType;

  cacheService: ICacheService;

  constructor(evmTransactionListenerParams: EVMTransactionListenerParamsType) {
    const {
      options,
      networkService,
      retryTransactionQueue,
      transactionDao,
      userOperationDao,
      userOperationDaoV07,
      userOperationStateDao,
      cacheService,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.entryPointV07Map = options.entryPointMapV07;
    this.networkService = networkService;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
    this.userOperationDao = userOperationDao;
    this.userOperationDaoV07 = userOperationDaoV07;
    this.userOperationStateDao = userOperationStateDao;
    this.cacheService = cacheService;
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<boolean> {
    const {
      transactionHash,
      transactionId,
      rawTransaction,
      relayerAddress,
      transactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      previousTransactionHash,
      timestamp,
    } = notifyTransactionListenerParams;

    const _log = log.child({
      transactionId,
      transactionHash,
      relayerAddress,
      transactionType,
      walletAddress,
      relayerManagerName,
      previousTransactionHash,
    });

    // if no transaction hash, means transaction was not published on chain e.g it was dropped
    if (!transactionHash) {
      await this.handleTransactionDropped(
        _log,
        transactionId,
        relayerAddress,
        transactionType,
      );

      return false;
    }

    // if no previous transaction hash, means transaction is still pending
    if (!previousTransactionHash) {
      await this.handleTransactionPending(
        _log,
        transactionId,
        transactionHash,
        rawTransaction,
        relayerAddress,
      );
    } else {
      // otherwise it means it was replaced by a transaction with a higher fee
      await this.handleReplacementTransaction(
        _log,
        transactionId,
        transactionHash,
        transactionType,
        previousTransactionHash,
        rawTransaction,
        relayerAddress,
        walletAddress,
        metaData,
      );
    }

    // retry txn service will check for receipt
    _log.info(`Publishing transaction data to retry transaction queue`);

    try {
      await this.publishToRetryTransactionQueue({
        relayerAddress,
        transactionType,
        transactionHash,
        transactionId,
        rawTransaction: rawTransaction as EVMRawTransactionType,
        walletAddress,
        metaData,
        relayerManagerName,
        timestamp,
      });
    } catch (publishToRetryTransactionQueueError) {
      _log.error(
        { publishToRetryTransactionQueueError },
        `Error while publishing to retry transaction queue`,
      );
    }

    // wait for transaction
    try {
      await this.waitForTransaction(notifyTransactionListenerParams);
    } catch (waitForTransactionError) {
      // timeout error
      // do nothing for now just log
      _log.error(
        { waitForTransactionError },
        `Error while waiting for transaction`,
      );
      return false;
    }

    return true;
  }

  private async handleReplacementTransaction(
    _log: pino.Logger,
    transactionId: string,
    transactionHash: string,
    transactionType: TransactionType,
    previousTransactionHash: string | undefined,
    rawTransaction: EVMRawTransactionType,
    relayerAddress: string,
    walletAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metaData: any,
  ) {
    _log.info(
      `A replacement transaction encountered, updating previous transaction to ${TransactionStatus.DROPPED}`,
    );

    await this.transactionDao.updateByTransactionIdAndTransactionHash(
      this.chainId,
      transactionId,
      transactionHash,
      {
        resubmitted: true,
        status: TransactionStatus.DROPPED,
        updationTime: Date.now(),
      },
    );

    _log.info(`Previous transaction updated to ${TransactionStatus.DROPPED}`);

    _log.info(`Saving new (replacement) transaction data`);

    await this.transactionDao.save(this.chainId, {
      transactionId,
      transactionType,
      transactionHash,
      previousTransactionHash,
      status: TransactionStatus.PENDING,
      rawTransaction: convertBigIntToString(rawTransaction),
      chainId: this.chainId,
      gasPrice: rawTransaction.gasPrice?.toString(),
      relayerAddress,
      walletAddress,
      metaData,
      resubmitted: false,
      creationTime: Date.now(),
      updationTime: Date.now(),
    });

    _log.info(
      `Saved new replacement transaction new transactionHash: ${transactionHash}`,
    );
  }

  private async handleTransactionPending(
    _log: pino.Logger,
    transactionId: string,
    transactionHash: string | undefined,
    rawTransaction: EVMRawTransactionType,
    relayerAddress: string,
  ) {
    _log.info(
      `Not a replacement transaction, updating transaction data to ${TransactionStatus.PENDING}`,
    );

    await this.transactionDao.updateByTransactionId(
      this.chainId,
      transactionId,
      {
        transactionHash,
        rawTransaction: convertBigIntToString(rawTransaction),
        relayerAddress,
        gasPrice: rawTransaction.gasPrice?.toString(),
        status: TransactionStatus.PENDING,
        updationTime: Date.now(),
      },
    );

    _log.info(`Transaction data updated`);
  }

  private async handleTransactionDropped(
    _log: pino.Logger,
    transactionId: string,
    relayerAddress: string,
    transactionType: TransactionType,
  ) {
    _log.error(
      { transactionId, relayerAddress },
      `transactionExecutionResponse is null hence updating transaction and userOp data`,
    );

    try {
      if (transactionType === TransactionType.BUNDLER) {
        _log.warn(
          `Updating Transaction status to ${TransactionStatus.DROPPED}`,
        );

        await this.transactionDao.updateByTransactionIdAndTransactionHash(
          this.chainId,
          transactionId,
          "null",
          {
            resubmitted: true,
            status: TransactionStatus.DROPPED,
            updationTime: Date.now(),
          },
        );

        await this.updateUserOpDataForFailureInTransactionExecution(
          transactionId,
        );

        _log.info(`transactionExecutionResponse is null`);
      }
    } catch (dataSavingError) {
      _log.error(
        { dataSavingError },
        `Error in updating transaction and userOp data`,
      );
    }
  }

  async publishToRetryTransactionQueue(
    data: RetryTransactionQueueData,
  ): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  // TODO: Refactor this
  private async onTransactionSuccess(
    onTransactionSuccessParams: OnTransactionSuccessParamsType,
  ) {
    const {
      transactionHash,
      transactionReceipt,
      transactionId,
      transactionType,
    } = onTransactionSuccessParams;

    const _log = log.child({
      transactionId,
      transactionHash,
    });

    if (!transactionReceipt) {
      _log.error(`Transaction receipt not found `);
      return;
    }

    let tryForV07 = false;

    if (transactionHash) {
      try {
        if (transactionType === TransactionType.BUNDLER) {
          _log.info(`Getting userOps for transactionId: ${transactionId}`);

          const userOps = await this.userOperationDao.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );

          if (!userOps.length) {
            log.info(
              `No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            tryForV07 = true;
          } else {
            for (let i = 0; i < userOps.length; i += 1) {
              const { userOpHash, entryPoint } = userOps[i];

              const entryPointContracts = this.entryPointMap[this.chainId];

              const entryPointContract = entryPointContracts.find(
                (contract) =>
                  contract.address.toLowerCase() === entryPoint.toLowerCase(),
              )?.entryPointContract;

              if (entryPointContract) {
                const userOpReceipt =
                  await getUserOperationReceiptForSuccessfulTransaction(
                    this.chainId,
                    userOpHash,
                    transactionReceipt,
                    entryPointContract,
                  );

                if (!userOpReceipt) {
                  _log.info(
                    `userOpReceipt not found for userOpHash: ${userOpHash}`,
                  );
                  return;
                }

                const { success, actualGasCost, actualGasUsed, reason, logs } =
                  userOpReceipt;

                const newUserOpData = convertBigIntToString({
                  transactionHash,
                  receipt: convertBigIntToString(transactionReceipt),
                  blockNumber: Number(transactionReceipt.blockNumber),
                  blockHash: transactionReceipt.blockHash,
                  status: TransactionStatus.SUCCESS,
                  success: success.toString(),
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs: convertBigIntToString(logs),
                });

                _log.info({ newUserOpData }, `Updating userOp data`);

                await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                  this.chainId,
                  transactionId,
                  userOpHash,
                  newUserOpData,
                );

                _log.info(`userOp data updated`);

                if (transactionType === TransactionType.BUNDLER) {
                  _log.info(
                    `Updating UserOperation state to: ${UserOperationStateEnum.CONFIRMED}`,
                  );

                  await this.userOperationStateDao.updateState(this.chainId, {
                    transactionId,
                    message: "Transaction confirmed",
                    state: UserOperationStateEnum.CONFIRMED,
                  });

                  log.info(
                    `Updated UserOperation state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                }
              } else {
                _log.error(
                  `entryPoint: ${entryPoint} not found in entry point map`,
                );
              }
            }
          }
        }

        if (transactionType === TransactionType.BUNDLER && tryForV07) {
          _log.info(`V0.7 Getting userOps for transactionId: ${transactionId}`);

          const userOps =
            await this.userOperationDaoV07.getUserOpsByTransactionId(
              this.chainId,
              transactionId,
            );

          if (!userOps.length) {
            _log.info(
              `V0.7 No user op found for transactionId: ${transactionId}`,
            );
            return;
          }

          for (let i = 0; i < userOps.length; i += 1) {
            const { userOpHash, entryPoint } = userOps[i];

            const entryPointContracts = this.entryPointV07Map[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) =>
                contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const userOpReceipt =
                await getUserOperationReceiptForSuccessfulTransaction(
                  this.chainId,
                  userOpHash,
                  transactionReceipt,
                  entryPointContract,
                );
              if (!userOpReceipt) {
                _log.info(`V0.7 userOpReceipt not found`);
                return;
              }

              const { success, actualGasCost, actualGasUsed, reason, logs } =
                userOpReceipt;

              const newData = convertBigIntToString({
                transactionHash,
                receipt: convertBigIntToString(transactionReceipt),
                blockNumber: Number(transactionReceipt.blockNumber),
                blockHash: transactionReceipt.blockHash,
                status: TransactionStatus.SUCCESS,
                success: success.toString(),
                actualGasCost,
                actualGasUsed,
                reason,
                logs: convertBigIntToString(logs),
              });

              _log.info({ newData }, `Updating userOp data`);

              await this.userOperationDaoV07.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                this.chainId,
                transactionId,
                userOpHash,
                newData,
              );

              _log.info(
                `v0.7 userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );

              if (transactionType === TransactionType.BUNDLER) {
                _log.info(
                  `v0.7 updating state to: ${UserOperationStateEnum.CONFIRMED}`,
                );

                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  message: "Transaction confirmed",
                  state: UserOperationStateEnum.CONFIRMED,
                });

                _log.info(
                  `v0.7 updated state to: ${UserOperationStateEnum.CONFIRMED}`,
                );
              }
            } else {
              _log.info(
                `v0.7 entryPoint: ${entryPoint} not found in entry point map`,
              );
            }
          }
        }
      } catch (error) {
        _log.error({ error }, `Error while saving userOp data to database`);
      }

      // Save transaction data to DB
      try {
        _log.info(`Saving transaction data to database`);

        let transactionFee = 0;
        let transactionFeeInUSD = 0;
        let transactionFeeCurrency = "";
        if (
          !transactionReceipt.gasUsed &&
          !transactionReceipt.effectiveGasPrice
        ) {
          _log.warn(
            `gasUsed or effectiveGasPrice field not found in transaction receipt`,
          );
        } else {
          transactionFee = Number(
            transactionReceipt.gasUsed * transactionReceipt.effectiveGasPrice,
          );
          transactionFeeCurrency = config.chains.currency[this.chainId];
          const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
          if (!coinsRateObj) {
            _log.info("Coins Rate Obj not fetched from cache");
          } else {
            transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId] || 0;
          }
        }

        await this.transactionDao.updateByTransactionIdAndTransactionHash(
          this.chainId,
          transactionId,
          transactionHash,
          {
            receipt: convertBigIntToString(transactionReceipt),
            transactionFee,
            transactionFeeInUSD,
            transactionFeeCurrency,
            status: TransactionStatus.SUCCESS,
            updationTime: Date.now(),
          },
        );
      } catch (err) {
        _log.error({ err }, `Error while saving transaction data to database`);
      }
    } else {
      _log.error(`No transactionExecutionResponse found`);
    }
  }

  private async onTransactionFailure(
    onTransactionFailureParams: OnTransactionFailureParamsType,
  ) {
    const {
      transactionHash,
      transactionId,
      transactionReceipt,
      transactionType,
    } = onTransactionFailureParams;

    const _log = log.child({
      transactionId,
      transactionHash,
    });

    if (!transactionReceipt) {
      _log.error(
        `Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      return;
    }

    let tryForV07 = false;
    if (transactionHash) {
      try {
        if (transactionType === TransactionType.BUNDLER) {
          _log.info(
            `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );

          const userOps = await this.userOperationDao.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );

          if (!userOps.length) {
            _log.info(`No user ops found`);
            tryForV07 = true;
          }
          for (let i = 0; i < userOps.length; i += 1) {
            const { userOpHash, entryPoint } = userOps[i];

            const entryPointContracts = this.entryPointMap[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) =>
                contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const latestBlock =
                await this.networkService.getLatestBlockNumber();

              _log.info({ latestBlock }, `Fetched latest block`);

              let fromBlock = latestBlock - BigInt(1000);
              if (config.astarNetworks.includes(this.chainId)) {
                fromBlock += BigInt(501);
              }

              log.info(
                `fromBlock: ${fromBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );

              const userOpReceipt =
                await getUserOperationReceiptForFailedTransaction(
                  this.chainId,
                  userOpHash,
                  transactionReceipt,
                  entryPointContract,
                  fromBlock,
                  this.networkService.provider,
                );

              if (!userOpReceipt) {
                log.info(
                  `userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );
                log.info(
                  `Updating userOp data: ${customJSONStringify(
                    convertBigIntToString({
                      transactionHash,
                      receipt: convertBigIntToString(transactionReceipt),
                      blockNumber: Number(transactionReceipt.blockNumber),
                      blockHash: transactionReceipt.blockHash,
                      status: TransactionStatus.FAILED,
                      success: "false",
                      actualGasCost: 0,
                      actualGasUsed: 0,
                      reason: null,
                      logs: null,
                    }),
                  )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                    this.chainId
                  }`,
                );

                await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                  this.chainId,
                  transactionId,
                  userOpHash,
                  convertBigIntToString({
                    transactionHash,
                    receipt: convertBigIntToString(transactionReceipt),
                    blockNumber: Number(transactionReceipt.blockNumber),
                    blockHash: transactionReceipt.blockHash,
                    status: TransactionStatus.FAILED,
                    success: "false",
                    actualGasCost: 0,
                    actualGasUsed: 0,
                    reason: "null",
                    logs: null,
                  }),
                );
                log.info(
                  `userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );

                if (transactionType === TransactionType.BUNDLER) {
                  log.info(
                    `updating state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                  await this.userOperationStateDao.updateState(this.chainId, {
                    transactionId,
                    state: UserOperationStateEnum.FAILED,
                    message: await this.getTransactionFailureMessage(
                      transactionReceipt,
                      entryPointContract,
                    ),
                  });
                  log.info(
                    `updated state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                }
                return;
              }
              const {
                success,
                actualGasCost,
                actualGasUsed,
                reason,
                logs,
                frontRunnedTransactionReceipt,
              } = userOpReceipt;

              log.info(
                `Updating transaction data for a front runned transaction for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              log.info(
                `Updating userOp data: ${customJSONStringify(
                  convertBigIntToString({
                    receipt: convertBigIntToString(
                      frontRunnedTransactionReceipt,
                    ),
                    transactionHash: (
                      frontRunnedTransactionReceipt as TransactionReceipt
                    ).transactionHash,
                    blockNumber: Number(
                      (frontRunnedTransactionReceipt as TransactionReceipt)
                        .blockNumber,
                    ),
                    blockHash: (
                      frontRunnedTransactionReceipt as TransactionReceipt
                    ).blockHash,
                    status: TransactionStatus.SUCCESS,
                    success,
                    actualGasCost,
                    actualGasUsed,
                    reason,
                    logs: convertBigIntToString(logs),
                  }),
                )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                  this.chainId
                }`,
              );

              await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                this.chainId,
                transactionId,
                userOpHash,
                convertBigIntToString({
                  receipt: convertBigIntToString(frontRunnedTransactionReceipt),
                  transactionHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).transactionHash,
                  blockNumber: Number(
                    (frontRunnedTransactionReceipt as TransactionReceipt)
                      .blockNumber,
                  ),
                  blockHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).blockHash,
                  status: TransactionStatus.SUCCESS,
                  success,
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs: convertBigIntToString(logs),
                }),
              );

              log.info(
                `userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              let frontRunnedTransactionFee = 0;
              let frontRunnedTransactionFeeInUSD = 0;
              let frontRunnedTransactionFeeCurrency = "";
              if (
                !frontRunnedTransactionReceipt.gasUsed &&
                !frontRunnedTransactionReceipt.effectiveGasPrice
              ) {
                log.info(
                  `gasUsed or effectiveGasPrice field not found in ${customJSONStringify(
                    frontRunnedTransactionReceipt,
                  )}`,
                );
              } else {
                frontRunnedTransactionFee = 0;
                try {
                  frontRunnedTransactionFee = Number(
                    frontRunnedTransactionReceipt.gasUsed *
                      frontRunnedTransactionReceipt.effectiveGasPrice,
                  );
                } catch (err) {
                  log.error(
                    `Error in calculating front ran transaction fee, defaulting to ${frontRunnedTransactionFee}`,
                    {
                      err,
                      transactionId,
                      chainId: this.chainId,
                      gasUsed: frontRunnedTransactionReceipt.gasUsed,
                      effectiveGasPrice:
                        frontRunnedTransactionReceipt.effectiveGasPrice,
                    },
                  );
                }

                frontRunnedTransactionFeeCurrency =
                  config.chains.currency[this.chainId];
                const coinsRateObj =
                  await this.cacheService.get(getTokenPriceKey());
                if (!coinsRateObj) {
                  log.info("Coins Rate Obj not fetched from cache");
                } else {
                  frontRunnedTransactionFeeInUSD =
                    JSON.parse(coinsRateObj)[this.chainId];
                }
              }

              await this.transactionDao.updateByTransactionIdAndTransactionHashForFrontRunnedTransaction(
                this.chainId,
                transactionId,
                transactionHash,
                {
                  frontRunnedTransactionHash:
                    frontRunnedTransactionReceipt.hash,
                  frontRunnedReceipt: convertBigIntToString(
                    frontRunnedTransactionReceipt,
                  ),
                  frontRunnedTransactionFee,
                  frontRunnedTransactionFeeInUSD,
                  frontRunnedTransactionFeeCurrency,
                  status: TransactionStatus.FAILED,
                  updationTime: Date.now(),
                },
              );

              if (transactionType === TransactionType.BUNDLER) {
                log.info(
                  `updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`,
                );
                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  transactionHash: frontRunnedTransactionReceipt.hash,
                  message:
                    "Transaction was front runned, check new transaction hash in receipt",
                  state: UserOperationStateEnum.CONFIRMED,
                });
                log.info(
                  `updated state state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`,
                );
              }
            } else {
              log.info(
                `entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
            }
          }
        }
        if (transactionType === TransactionType.BUNDLER && tryForV07) {
          log.info(
            `V0.7 Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );

          const userOps =
            await this.userOperationDaoV07.getUserOpsByTransactionId(
              this.chainId,
              transactionId,
            );
          if (!userOps.length) {
            log.info(
              `V0.7 No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            return;
          }
          for (
            let userOpIndex = 0;
            userOpIndex < userOps.length;
            userOpIndex += 1
          ) {
            const { userOpHash, entryPoint } = userOps[userOpIndex];

            const entryPointContracts = this.entryPointV07Map[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) =>
                contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const latestBlock =
                await this.networkService.getLatestBlockNumber();
              log.info(
                `v0.7 latestBlock: ${latestBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              let fromBlock = latestBlock - BigInt(1000);
              if (config.astarNetworks.includes(this.chainId)) {
                fromBlock += BigInt(501);
              }
              log.info(
                `v0.7 fromBlock: ${fromBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              const userOpReceipt =
                await getUserOperationReceiptForFailedTransaction(
                  this.chainId,
                  userOpHash,
                  transactionReceipt,
                  entryPointContract,
                  fromBlock,
                  this.networkService.provider,
                );

              if (!userOpReceipt) {
                log.info(
                  `v0.7 userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );
                log.info(
                  `v0.7 Updating userOp data: ${customJSONStringify(
                    convertBigIntToString({
                      transactionHash,
                      receipt: convertBigIntToString(transactionReceipt),
                      blockNumber: Number(transactionReceipt.blockNumber),
                      blockHash: transactionReceipt.blockHash,
                      status: TransactionStatus.FAILED,
                      success: "false",
                      actualGasCost: 0,
                      actualGasUsed: 0,
                      reason: null,
                      logs: null,
                    }),
                  )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                    this.chainId
                  }`,
                );

                await this.userOperationDaoV07.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                  this.chainId,
                  transactionId,
                  userOpHash,
                  convertBigIntToString({
                    transactionHash,
                    receipt: convertBigIntToString(transactionReceipt),
                    blockNumber: Number(transactionReceipt.blockNumber),
                    blockHash: transactionReceipt.blockHash,
                    status: TransactionStatus.FAILED,
                    success: "false",
                    actualGasCost: 0,
                    actualGasUsed: 0,
                    reason: "null",
                    logs: null,
                  }),
                );
                log.info(
                  `v0.7 userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );

                if (transactionType === TransactionType.BUNDLER) {
                  log.info(
                    `v0.7 updating state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                  await this.userOperationStateDao.updateState(this.chainId, {
                    transactionId,
                    state: UserOperationStateEnum.FAILED,
                    message: await this.getTransactionFailureMessage(
                      transactionReceipt,
                      entryPointContract,
                    ),
                  });
                  log.info(
                    `v0.7 updated state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                }
                return;
              }
              const {
                success,
                actualGasCost,
                actualGasUsed,
                reason,
                logs,
                frontRunnedTransactionReceipt,
              } = userOpReceipt;

              log.info(
                `Updating transaction data for a front runned transaction for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );

              await this.userOperationDaoV07.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                this.chainId,
                transactionId,
                userOpHash,
                convertBigIntToString({
                  receipt: convertBigIntToString(frontRunnedTransactionReceipt),
                  transactionHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).transactionHash,
                  blockNumber: Number(
                    (frontRunnedTransactionReceipt as TransactionReceipt)
                      .blockNumber,
                  ),
                  blockHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).blockHash,
                  status: TransactionStatus.SUCCESS,
                  success,
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs: convertBigIntToString(logs),
                }),
              );

              log.info(
                `userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              let frontRunnedTransactionFee = 0;
              let frontRunnedTransactionFeeInUSD = 0;
              let frontRunnedTransactionFeeCurrency = "";
              if (
                !frontRunnedTransactionReceipt.gasUsed &&
                !frontRunnedTransactionReceipt.effectiveGasPrice
              ) {
                log.info(
                  `gasUsed or effectiveGasPrice field not found in ${customJSONStringify(
                    frontRunnedTransactionReceipt,
                  )}`,
                );
              } else {
                frontRunnedTransactionFee = 0;
                try {
                  frontRunnedTransactionFee = Number(
                    frontRunnedTransactionReceipt.gasUsed *
                      frontRunnedTransactionReceipt.effectiveGasPrice,
                  );
                } catch (err) {
                  log.error(
                    `Error in calculating front ran transaction fee, defaulting to ${frontRunnedTransactionFee}`,
                    {
                      err,
                      transactionId,
                      chainId: this.chainId,
                      gasUsed: frontRunnedTransactionReceipt.gasUsed,
                      effectiveGasPrice:
                        frontRunnedTransactionReceipt.effectiveGasPrice,
                    },
                  );
                }

                frontRunnedTransactionFeeCurrency =
                  config.chains.currency[this.chainId];
                const coinsRateObj =
                  await this.cacheService.get(getTokenPriceKey());
                if (!coinsRateObj) {
                  log.info("Coins Rate Obj not fetched from cache");
                } else {
                  frontRunnedTransactionFeeInUSD =
                    JSON.parse(coinsRateObj)[this.chainId];
                }
              }

              await this.transactionDao.updateByTransactionIdAndTransactionHashForFrontRunnedTransaction(
                this.chainId,
                transactionId,
                transactionHash,
                {
                  frontRunnedTransactionHash:
                    frontRunnedTransactionReceipt.hash,
                  frontRunnedReceipt: convertBigIntToString(
                    frontRunnedTransactionReceipt,
                  ),
                  frontRunnedTransactionFee,
                  frontRunnedTransactionFeeInUSD,
                  frontRunnedTransactionFeeCurrency,
                  status: TransactionStatus.FAILED,
                  updationTime: Date.now(),
                },
              );

              if (transactionType === TransactionType.BUNDLER) {
                log.info(
                  `updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`,
                );
                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  transactionHash: frontRunnedTransactionReceipt.hash,
                  message:
                    "Transaction was front runned, check new transaction hash in receipt",
                  state: UserOperationStateEnum.CONFIRMED,
                });
                log.info(
                  `updated state state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`,
                );
              }
            } else {
              log.info(
                `entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
            }
          }
        }
      } catch (error) {
        log.error(
          `Error in saving userOp data in database for transactionId: ${transactionId} on chainId ${
            this.chainId
          } with error: ${parseError(error)}`,
        );
      }

      try {
        log.info(
          `Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        let transactionFee = 0;
        let transactionFeeInUSD = 0;
        let transactionFeeCurrency = "";
        if (
          !transactionReceipt.gasUsed &&
          !transactionReceipt.effectiveGasPrice
        ) {
          log.info(
            `gasUsed or effectiveGasPrice field not found in ${customJSONStringify(
              transactionReceipt,
            )}`,
          );
        } else {
          transactionFee = Number(
            transactionReceipt.gasUsed * transactionReceipt.effectiveGasPrice,
          );
          transactionFeeCurrency = config.chains.currency[this.chainId];
          const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
          if (!coinsRateObj) {
            log.info("Coins Rate Obj not fetched from cache");
          } else {
            transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId] || 0;
          }
        }
        await this.transactionDao.updateByTransactionIdAndTransactionHash(
          this.chainId,
          transactionId,
          transactionHash,
          {
            receipt: convertBigIntToString(transactionReceipt),
            transactionFee,
            transactionFeeInUSD,
            transactionFeeCurrency,
            status: TransactionStatus.FAILED,
            updationTime: Date.now(),
          },
        );
      } catch (error) {
        log.error(
          `Error in saving transaction data in database for transactionId: ${transactionId} on chainId ${
            this.chainId
          } with error: ${parseError(error)}`,
        );
      }
    } else {
      log.info(
        `No transactionExecutionResponse found for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
    }
  }

  private async updateUserOpDataForFailureInTransactionExecution(
    transactionId: string,
  ): Promise<void> {
    const _log = log.child({
      transactionId,
      chainId: this.chainId,
    });

    const userOps = await this.userOperationDao.getUserOpsByTransactionId(
      this.chainId,
      transactionId,
    );

    if (userOps.length === 0) {
      _log.info(`No user op found for transactionId: ${transactionId}`);
      return;
    }

    _log.info({ numUserOps: userOps.length }, "Got user ops by transaction ID");

    for (let i = 0; i < userOps.length; i++) {
      const { userOpHash } = userOps[i];

      await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
        this.chainId,
        transactionId,
        userOpHash,
        {
          transactionHash: undefined,
          receipt: {},
          blockNumber: 0,
          blockHash: "null",
          status: TransactionStatus.DROPPED,
          success: "false",
          actualGasCost: 0,
          actualGasUsed: 0,
          reason: "null",
          logs: null,
        },
      );

      _log.info(
        { userOpHash },
        `Updated user op status to ${TransactionStatus.DROPPED}`,
      );
    }
  }

  private async waitForTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    const {
      transactionHash,
      transactionId,
      rawTransaction,
      relayerAddress,
      previousTransactionHash,
      walletAddress,
      metaData,
      transactionType,
      relayerManagerName,
    } = notifyTransactionListenerParams;
    if (!transactionHash) {
      return;
    }
    log.info(
      `Transaction hash is: ${transactionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`,
    );

    try {
      if (this.networkService.mevProtectedRpcUrl) {
        return this.waitForFlashbotsTransaction(
          notifyTransactionListenerParams,
        );
      }

      const transactionReceipt = await this.networkService.waitForTransaction(
        transactionHash,
        transactionId,
        // timeout is set to 2 times because it ensures that transaction would
        // have resubmitted and no need to keep polling it
        // Number(2 * config.chains.retryTransactionInterval[this.chainId]),
      );

      log.info(
        `Transaction receipt is: ${customJSONStringify(
          transactionReceipt,
        )} for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );

      // TODO: reduce pending count of relayer via RelayerManager
      await this.cacheService.delete(
        getRetryTransactionCountKey(transactionId, this.chainId),
      );

      await this.cacheService.set(getTransactionMinedKey(transactionId), "1");

      if (
        (transactionReceipt.status as unknown as number) === 1 ||
        (transactionReceipt.status as unknown as string) === "0x1"
      ) {
        log.info(
          `Transaction is a success for transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        this.onTransactionSuccess({
          transactionHash,
          rawTransaction,
          transactionId,
          transactionReceipt,
          relayerAddress,
          transactionType,
          previousTransactionHash,
          walletAddress,
          metaData,
          relayerManagerName,
        });
      }
      if (
        (transactionReceipt.status as unknown as number) === 0 ||
        (transactionReceipt.status as unknown as string) === "0x0"
      ) {
        log.info(
          `Transaction is a failure for transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        this.onTransactionFailure({
          transactionHash,
          rawTransaction,
          transactionId,
          transactionReceipt,
          relayerAddress,
          transactionType,
          previousTransactionHash,
          walletAddress,
          metaData,
          relayerManagerName,
        });
      }
    } catch (error) {
      log.error(
        `Error in waitForTransaction: ${parseError(
          error,
        )} on hash: ${transactionHash} for transactionId: ${transactionId} on chainId ${
          this.chainId
        }`,
      );
    }
  }

  async waitForFlashbotsTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    if (
      !this.networkService.supportsFlashbots ||
      !this.networkService.flashbots
    ) {
      throw new Error(
        `Flashbots service not available for chainId: ${this.networkService.chainId}`,
      );
    }

    const { transactionHash, transactionId, relayerAddress } =
      notifyTransactionListenerParams;

    const _log = log.child({
      chainId: this.chainId,
      transactionHash,
      transactionId,
      relayerAddress,
    });

    if (!transactionHash) {
      return;
    }

    try {
      _log.info(`Start waiting for flashbots transaction`);

      const response =
        await this.networkService.flashbots.waitForTransaction(transactionHash);

      _log.info(
        { transactionHash, transactionId, chainId: this.chainId },
        `Flashbots response: ${customJSONStringify(response)}`,
      );

      await this.cacheService.delete(
        getRetryTransactionCountKey(transactionId, this.chainId),
      );

      await this.cacheService.set(getTransactionMinedKey(transactionId), "1");

      if (response.status === FlashbotsTxStatus.INCLUDED) {
        _log.info(
          { chainId: this.chainId, transactionHash, transactionId },
          `Transaction included`,
        );

        // get the recept and call onTransactionSuccess
        const transactionReceipt =
          await this.networkService.getTransactionReceipt(transactionHash);

        if (transactionReceipt) {
          notifyTransactionListenerParams.transactionReceipt =
            transactionReceipt;
        }

        await this.onTransactionSuccess(notifyTransactionListenerParams);
      } else {
        _log.info(
          { chainId: this.chainId, transactionHash, transactionId },
          `Transaction not included`,
        );

        const transactionReceipt =
          await this.networkService.getTransactionReceipt(transactionHash);

        if (transactionReceipt) {
          notifyTransactionListenerParams.transactionReceipt =
            transactionReceipt;
        }

        await this.onTransactionFailure(notifyTransactionListenerParams);
      }
    } catch (error) {
      _log.error(
        {
          err: error,
        },
        `Error in waitForFlashbotsTransaction`,
      );
    }
  }

  async getTransactionFailureMessage(
    receipt: TransactionReceipt,
    entryPointContract: EntryPointContractType | EntryPointV07ContractType,
  ): Promise<string> {
    try {
      const getTransactionResponse = await this.networkService.getTransaction(
        receipt.transactionHash,
      );

      if (!getTransactionResponse) {
        return "Unable to parse transaction failure reason, please check transaction hash on explorer";
      }

      const { from, to, input, gasPrice } = getTransactionResponse;

      const gasInHex = toHex(receipt.gasUsed).substring(2).replace(/^0+/, "");
      const gasPriceInHex = toHex(gasPrice as bigint)
        .substring(2)
        .replace(/^0+/, "");

      const handleOpResult = await this.networkService.ethCall([
        {
          from,
          to,
          data: input,
          gas: gasInHex,
          gasPrice: gasPriceInHex,
        },
      ]);

      const ethCallData = handleOpResult.error.data;
      log.info(`ethCallData: ${ethCallData}`);

      const errorDescription = decodeErrorResult({
        abi: entryPointContract.abi,
        data: ethCallData,
      });
      const { args } = errorDescription;

      if (errorDescription.errorName === "FailedOp") {
        const revertReason = args[0];
        return `Transaction failed on chain with reason: ${revertReason}`;
      }
      return "Unable to parse transaction failure reason, please check transaction hash on explorer";
    } catch (error) {
      log.error(error);
      return "Unable to parse transaction failure reason, please check transaction hash on explorer";
    }
  }
}
