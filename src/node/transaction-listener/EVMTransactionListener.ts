/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { TransactionReceipt } from "viem";
import { ICacheService } from "../../common/cache";
import { IUserOperationDAO, IUserOperationStateDAO } from "../../common/db";
import { logger } from "../../common/logger";
import {
  EntryPointMap,
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
  UserOperationStateEnum,
} from "../../common/types";
import {
  getRetryTransactionCountKey,
  getTransactionMinedKey,
  parseError,
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
import { config } from "../../common/config";
import { INetworkService } from "../network";
import {
  getUserOperationReceiptForSuccessfulTransaction,
  getUserOperationReceiptForFailedTransaction,
} from "./utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMTransactionListener
  implements
    ITransactionListener<
      IEVMAccount,
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >
{
  chainId: number;

  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  userOperationDao: IUserOperationDAO;

  userOperationStateDao: IUserOperationStateDAO;

  entryPointMap: EntryPointMap;

  cacheService: ICacheService;

  constructor(evmTransactionListenerParams: EVMTransactionListenerParamsType) {
    const {
      options,
      networkService,
      userOperationDao,
      userOperationStateDao,
      cacheService,
    } = evmTransactionListenerParams;
    this.chainId = networkService.chainId;
    this.entryPointMap = options.entryPointMap;
    this.networkService = networkService;
    this.userOperationDao = userOperationDao;
    this.userOperationStateDao = userOperationStateDao;
    this.cacheService = cacheService;
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<boolean> {
    const { transactionHash, transactionId, } =
      notifyTransactionListenerParams;
    // TODO call retry transaction logic

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

  private async onTransactionSuccess(
    onTransactionSuccessParams: OnTransactionSuccessParamsType,
  ) {
    const { transactionHash, transactionReceipt, transactionId } =
      onTransactionSuccessParams;

    try {
      log.info(
        `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
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
                status: UserOperationStateEnum.CONFIRMED,
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
              status: UserOperationStateEnum.CONFIRMED,
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
        } else {
          log.info(
            `entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`,
          );
        }
      }
    } catch (error) {
      log.error(
        `Error in saving userOp data in database for transactionId: ${transactionId} on chainId ${
          this.chainId
        } with error: ${parseError(error)}`,
      );
    }
  }

  private async onTransactionFailure(
    onTransactionFailureParams: OnTransactionFailureParamsType,
  ) {
    const { transactionHash, transactionId, transactionReceipt } =
      onTransactionFailureParams;

    if (transactionHash) {
      try {
        log.info(
          `Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`,
        );

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
            const latestBlock = await this.networkService.getLatesBlockNumber();
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
                this.networkService.publicClient,
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
                `Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`,
              );

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
                    status: UserOperationStateEnum.FAILED,
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
                  status: UserOperationStateEnum.FAILED,
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

              log.info(
                `updating state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
              await this.userOperationStateDao.updateState(this.chainId, {
                transactionId,
                state: UserOperationStateEnum.FAILED,
                message: `UserOperation reverted`,
              });
              log.info(
                `updated state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );

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
              `Transaction got front runned. Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`,
            );

            log.info(
              `Updating transaction data for a front runned transaction for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            log.info(
              `Updating userOp data: ${customJSONStringify(
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
                  status: UserOperationStateEnum.CONFIRMED,
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
                blockHash: (frontRunnedTransactionReceipt as TransactionReceipt)
                  .blockHash,
                status: UserOperationStateEnum.CONFIRMED,
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
          } else {
            log.info(
              `entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
          }
        }
      } catch (error) {
        log.error(
          `Error in saving userOp data in database for transactionId: ${transactionId} on chainId ${
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
          status: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
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
    } = notifyTransactionListenerParams;

    log.info(
      `Transaction hash is: ${transactionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`,
    );

    try {
      const transactionReceipt = await this.networkService.waitForTransaction(
        transactionHash,
        transactionId,
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

      // TODO Set expiry
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
          previousTransactionHash,
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
          previousTransactionHash,
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
}
