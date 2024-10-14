/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
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
    } = notifyTransactionListenerParams;

    // if no transactionExecutionResponse then it means transactions was not published onc hain
    // update transaction and user op collection
    if (!transactionHash) {
      log.error(`transactionExecutionResponse is null for transactionId: ${transactionId} for bundler: ${relayerAddress} hence
      updating transaction and userOp data`);
      try {
        if (transactionType === TransactionType.BUNDLER) {
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
          this.updateUserOpDataForFailureInTransactionExecution(transactionId);
        }
      } catch (dataSavingError) {
        log.error(
          `Error in updating transaction and userOp data for transactionId: ${transactionId} with error: ${parseError(
            dataSavingError,
          )}`,
        );
      }

      log.error(
        `transactionExecutionResponse is null for transactionId: ${transactionId} for bundler: ${relayerAddress}`,
      );
      return false;
    }

    if (!previousTransactionHash) {
      log.info(
        `Not a replacement transaction, updating data for transactionId: ${transactionId} on chainId: ${this.chainId}`,
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
      log.info(
        `Data updated for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
    } else {
      log.info(
        `A replacement transaction, updating data for transactionId: ${transactionId} on chainId: ${this.chainId}`,
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
      log.info(
        `Replacement transaction data updated for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      log.info(
        `A replacement transaction encountered, saving new transaction data for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
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
      log.info(
        `Saved new data for the replaced transaction with transactionId: ${transactionId} on chainId: ${this.chainId} with new transactionHash: ${transactionHash}`,
      );
    }

    // retry txn service will check for receipt
    log.info(
      `Publishing transaction data of transactionId: ${transactionId} to retry transaction queue on chainId ${this.chainId}`,
    );
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
      });
    } catch (publishToRetryTransactionQueueError) {
      log.error(
        `publishToRetryTransactionQueueError: ${parseError(
          publishToRetryTransactionQueueError,
        )} while publishing to retry transaction queue for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );
    }

    // wait for transaction
    try {
      await this.waitForTransaction(notifyTransactionListenerParams);
    } catch (waitForTransactionError) {
      // timeout error
      // do nothing for now just log
      log.error(
        `Error in waitForTransaction: ${parseError(
          waitForTransactionError,
        )} on hash: ${transactionHash} for transactionId: ${transactionId} on chainId ${
          this.chainId
        }`,
      );
      return false;
    }

    return true;
  }

  async publishToRetryTransactionQueue(
    data: RetryTransactionQueueData,
  ): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(
    onTransactionSuccessParams: OnTransactionSuccessParamsType,
  ) {
    const {
      transactionHash,
      transactionReceipt,
      transactionId,
      transactionType,
    } = onTransactionSuccessParams;
    if (!transactionReceipt) {
      log.error(
        `Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      return;
    }

    let tryForV07 = false;
    if (transactionHash) {
      try {
        log.info(
          `transactionType: ${transactionType} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        if (transactionType === TransactionType.BUNDLER) {
          log.info(
            `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
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
            for (
              let userOpIndex = 0;
              userOpIndex < userOps.length;
              userOpIndex += 1
            ) {
              const { userOpHash, entryPoint } = userOps[userOpIndex];

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
                log.info(
                  `userOpReceipt: ${customJSONStringify(
                    userOpReceipt,
                  )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                    this.chainId
                  }`,
                );
                if (!userOpReceipt) {
                  log.info(
                    `userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                  return;
                }
                const { success, actualGasCost, actualGasUsed, reason, logs } =
                  userOpReceipt;

                log.info(
                  `Updating userOp data: ${customJSONStringify(
                    convertBigIntToString({
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
                    status: TransactionStatus.SUCCESS,
                    success: success.toString(),
                    actualGasCost,
                    actualGasUsed,
                    reason,
                    logs: convertBigIntToString(logs),
                  }),
                );
                log.info(
                  `userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );

                if (transactionType === TransactionType.BUNDLER) {
                  log.info(
                    `updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                  await this.userOperationStateDao.updateState(this.chainId, {
                    transactionId,
                    message: "Transaction confirmed",
                    state: UserOperationStateEnum.CONFIRMED,
                  });
                  log.info(
                    `updated state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                  );
                }
              } else {
                log.info(
                  `entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );
              }
            }
          }
        }
        if (transactionType === TransactionType.BUNDLER && tryForV07) {
          log.info(
            `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
          const userOps =
            await this.userOperationDaoV07.getUserOpsByTransactionId(
              this.chainId,
              transactionId,
            );
          if (!userOps.length) {
            log.info(
              `No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
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
              const userOpReceipt =
                await getUserOperationReceiptForSuccessfulTransaction(
                  this.chainId,
                  userOpHash,
                  transactionReceipt,
                  entryPointContract,
                );
              log.info(
                `userOpReceipt: ${customJSONStringify(
                  userOpReceipt,
                )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                  this.chainId
                }`,
              );
              if (!userOpReceipt) {
                log.info(
                  `userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );
                return;
              }
              const { success, actualGasCost, actualGasUsed, reason, logs } =
                userOpReceipt;

              log.info(
                `Updating userOp data: ${customJSONStringify(
                  convertBigIntToString({
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
                  status: TransactionStatus.SUCCESS,
                  success: success.toString(),
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs: convertBigIntToString(logs),
                }),
              );
              log.info(
                `userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );

              if (transactionType === TransactionType.BUNDLER) {
                log.info(
                  `updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
                );
                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  message: "Transaction confirmed",
                  state: UserOperationStateEnum.CONFIRMED,
                });
                log.info(
                  `updated state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
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
            status: TransactionStatus.SUCCESS,
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
      log.error(
        `No transactionExecutionResponse found for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
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
    if (!transactionReceipt) {
      log.error(
        `Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      return;
    }

    let tryForV07 = false;
    if (transactionHash) {
      try {
        log.info(
          `transactionType: ${transactionType} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );
        if (transactionType === TransactionType.BUNDLER) {
          log.info(
            `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );

          const userOps = await this.userOperationDao.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );
          if (!userOps.length) {
            log.info(
              `No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            tryForV07 = true;
          }
          for (
            let userOpIndex = 0;
            userOpIndex < userOps.length;
            userOpIndex += 1
          ) {
            const { userOpHash, entryPoint } = userOps[userOpIndex];

            const entryPointContracts = this.entryPointMap[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) =>
                contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const latestBlock =
                await this.networkService.getLatesBlockNumber();
              log.info(
                `latestBlock: ${latestBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
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
              log.info(
                `userOpReceipt: ${customJSONStringify(
                  userOpReceipt,
                )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                  this.chainId
                }`,
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
            `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );

          const userOps = await this.userOperationDaoV07.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );
          if (!userOps.length) {
            log.info(
              `No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
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
                await this.networkService.getLatesBlockNumber();
              log.info(
                `latestBlock: ${latestBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
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
              log.info(
                `userOpReceipt: ${customJSONStringify(
                  userOpReceipt,
                )} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${
                  this.chainId
                }`,
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
    const userOps = await this.userOperationDao.getUserOpsByTransactionId(
      this.chainId,
      transactionId,
    );
    log.info(
      `userOps: ${customJSONStringify(
        userOps,
      )} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );
    if (!userOps.length) {
      log.info(
        `No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
      return;
    }

    for (let userOpIndex = 0; userOpIndex < userOps.length; userOpIndex += 1) {
      const { userOpHash } = userOps[userOpIndex];
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
      return "Unable to parse transaction failure reason, please check transaction hash on explorer";
    }
  }
}
