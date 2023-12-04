/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { TransactionReceipt, decodeErrorResult, toHex } from 'viem';
import { ICacheService } from '../../../../common/cache';
import {
  ITransactionDAO, IUserOperationDAO, IUserOperationStateDAO,
} from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/logger';
import { INetworkService } from '../../../../common/network';
import { RetryTransactionQueueData } from '../../../../common/queue/types';
import {
  EntryPointContractType,
  EntryPointMapType,
  EVMRawTransactionType,
  SocketEventType,
  TransactionQueueMessageType,
  TransactionStatus,
  TransactionType,
  UserOperationStateEnum,
} from '../../../../common/types';
import {
  getRetryTransactionCountKey,
  getTokenPriceKey,
  getTransactionMinedKey,
  parseError,
  getUserOperationReceiptForFailedTransaction,
  getUserOperationReceiptForSuccessfulTransaction,
} from '../../../../common/utils';
import { IEVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  FrontRunnedTransactionDataToBeUpdatedInDatabaseType,
  NewTransactionDataToBeSavedInDatabaseType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionDataToBeUpdatedInDatabaseType,
  TransactionListenerNotifyReturnType,
} from './types';
import { config } from '../../../../config';
import { AstarNetworks } from '../../../../common/constants';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export class EVMTransactionListener implements
ITransactionListener<IEVMAccount, EVMRawTransactionType>,
ITransactionPublisher<TransactionQueueMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionQueueMessageType>;

  retryTransactionQueue: IQueue<RetryTransactionQueueData>;

  transactionDao: ITransactionDAO;

  userOperationDao: IUserOperationDAO;

  userOperationStateDao: IUserOperationStateDAO;

  entryPointMap: EntryPointMapType;

  cacheService: ICacheService;

  constructor(
    evmTransactionListenerParams: EVMTransactionListenerParamsType,
  ) {
    const {
      options,
      networkService,
      transactionQueue,
      retryTransactionQueue,
      transactionDao,
      userOperationDao,
      userOperationStateDao,
      cacheService,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.networkService = networkService;
    this.transactionQueue = transactionQueue;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
    this.userOperationDao = userOperationDao;
    this.userOperationStateDao = userOperationStateDao;
    this.cacheService = cacheService;
  }

  async publishToTransactionQueue(data: TransactionQueueMessageType): Promise<boolean> {
    await this.transactionQueue.publish(data);
    return true;
  }

  async publishToRetryTransactionQueue(data: RetryTransactionQueueData): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTransactionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse,
      transactionReceipt,
      transactionId,
      relayerManagerName,
      transactionType,
    } = onTransactionSuccessParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }

    log.info(`Publishing to transaction queue on success for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    if (!(transactionType === TransactionType.BUNDLER)) {
      await this.publishToTransactionQueue({
        transactionId,
        relayerManagerName,
        transactionHash: transactionExecutionResponse?.hash,
        receipt: transactionReceipt,
        event: SocketEventType.onTransactionMined,
      });
    }
    if (transactionExecutionResponse) {
      try {
        log.info(`transactionType: ${transactionType} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
        if (transactionType === TransactionType.BUNDLER || transactionType === TransactionType.AA) {
          log.info(`Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`);
          const userOps = await this.userOperationDao.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );
          log.info(`userOps: ${JSON.stringify(userOps)} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
          if (!userOps.length) {
            log.info(`No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`);
            return;
          }
          for (let userOpIndex = 0; userOpIndex < userOps.length; userOpIndex += 1) {
            const { userOpHash, entryPoint } = userOps[userOpIndex];

            const entryPointContracts = this.entryPointMap[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) => contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const userOpReceipt = await getUserOperationReceiptForSuccessfulTransaction(
                this.chainId,
                userOpHash,
                transactionReceipt,
                entryPointContract,
              );
              log.info(`userOpReceipt: ${JSON.stringify(userOpReceipt)} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              if (!userOpReceipt) {
                log.info(`userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
                return;
              }
              const {
                success,
                actualGasCost,
                actualGasUsed,
                reason,
                logs,
              } = userOpReceipt;

              log.info(`Updating userOp data: ${JSON.stringify({
                transactionHash: transactionExecutionResponse?.hash,
                receipt: transactionReceipt,
                blockNumber: transactionReceipt.blockNumber,
                blockHash: transactionReceipt.blockHash,
                status: TransactionStatus.SUCCESS,
                success,
                actualGasCost,
                actualGasUsed,
                reason,
                logs,
              })} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                this.chainId,
                transactionId,
                userOpHash,
                {
                  transactionHash: transactionExecutionResponse?.hash,
                  receipt: transactionReceipt,
                  blockNumber: transactionReceipt.blockNumber,
                  blockHash: transactionReceipt.blockHash,
                  status: TransactionStatus.SUCCESS,
                  success,
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs,
                },
              );
              log.info(`userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);

              if (transactionType === TransactionType.BUNDLER) {
                log.info(`updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  message: 'Transaction confirmed',
                  state: UserOperationStateEnum.CONFIRMED,
                });
                log.info(`updated state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              }
            } else {
              log.info(`entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`);
            }
          }
        }
      } catch (error) {
        log.error(`Error in saving userOp data in database for transactionId: ${transactionId} on chainId ${this.chainId} with error: ${parseError(error)}`);
      }

      try {
        log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
        let transactionFee = 0;
        let transactionFeeInUSD = 0;
        let transactionFeeCurrency = '';
        if (!transactionReceipt.gasUsed && !transactionReceipt.effectiveGasPrice) {
          log.info(`gasUsed or effectiveGasPrice field not found in ${JSON.stringify(transactionExecutionResponse)}`);
        } else {
          transactionFee = Number(
            transactionReceipt.gasUsed * (transactionReceipt.effectiveGasPrice),
          );
          transactionFeeCurrency = config.chains.currency[this.chainId];
          const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
          if (!coinsRateObj) {
            log.info('Coins Rate Obj not fetched from cache'); // TODO should it make call to token price service?
          } else {
            transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId];
          }
        }
        await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
          receipt: transactionReceipt,
          transactionFee,
          transactionFeeInUSD,
          transactionFeeCurrency,
          status: TransactionStatus.SUCCESS,
          updationTime: Date.now(),
        }, transactionId, transactionExecutionResponse?.hash);
      } catch (error) {
        log.error(`Error in saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId} with error: ${parseError(error)}`);
      }
    } else {
      log.error(`No transactionExecutionResponse found for transactionId: ${transactionId} on chainId ${this.chainId}`);
    }
  }

  private async onTransactionFailure(onTransactionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      transactionReceipt,
      relayerManagerName,
      transactionType,
    } = onTransactionFailureParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }
    if (!(transactionType === TransactionType.BUNDLER || transactionType === TransactionType.AA)) {
      log.info(`Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
      await this.publishToTransactionQueue({
        transactionId,
        relayerManagerName,
        transactionHash: transactionExecutionResponse?.hash,
        receipt: transactionReceipt,
        event: SocketEventType.onTransactionMined,
      });
    }

    if (transactionExecutionResponse) {
      try {
        log.info(`transactionType: ${transactionType} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
        if (transactionType === TransactionType.BUNDLER || transactionType === TransactionType.AA) {
          log.info(`Getting userOps for transactionId: ${transactionId} on chainId: ${this.chainId}`);

          const userOps = await this.userOperationDao.getUserOpsByTransactionId(
            this.chainId,
            transactionId,
          );
          log.info(`userOps: ${JSON.stringify(userOps)} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
          if (!userOps.length) {
            log.info(`No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`);
            return;
          }
          for (let userOpIndex = 0; userOpIndex < userOps.length; userOpIndex += 1) {
            const { userOpHash, entryPoint } = userOps[userOpIndex];

            const entryPointContracts = this.entryPointMap[this.chainId];

            const entryPointContract = entryPointContracts.find(
              (contract) => contract.address.toLowerCase() === entryPoint.toLowerCase(),
            )?.entryPointContract;

            if (entryPointContract) {
              const latestBlock = await this.networkService.getLatesBlockNumber();
              log.info(`latestBlock: ${latestBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              let fromBlock = latestBlock - BigInt(1000);
              if (AstarNetworks.includes(this.chainId)) {
                fromBlock += BigInt(501);
              }
              log.info(`fromBlock: ${fromBlock} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              const userOpReceipt = await getUserOperationReceiptForFailedTransaction(
                this.chainId,
                userOpHash,
                transactionReceipt,
                entryPointContract,
                fromBlock,
                this.networkService.provider,
              );
              log.info(`userOpReceipt: ${JSON.stringify(userOpReceipt)} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);

              if (!userOpReceipt) {
                log.info(`Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
                await this.publishToTransactionQueue({
                  transactionId,
                  relayerManagerName,
                  transactionHash: transactionExecutionResponse?.hash,
                  receipt: transactionReceipt,
                  event: SocketEventType.onTransactionMined,
                });

                log.info(`userOpReceipt not fetched for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
                log.info(`Updating userOp data: ${JSON.stringify({
                  transactionHash: transactionExecutionResponse?.hash,
                  receipt: transactionReceipt,
                  blockNumber: transactionReceipt.blockNumber,
                  blockHash: transactionReceipt.blockHash,
                  status: TransactionStatus.FAILED,
                  success: 'false',
                  actualGasCost: 0,
                  actualGasUsed: 0,
                  reason: null,
                  logs: null,
                })} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);

                await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                  this.chainId,
                  transactionId,
                  userOpHash,
                  {
                    transactionHash: transactionExecutionResponse?.hash,
                    receipt: transactionReceipt,
                    blockNumber: transactionReceipt.blockNumber,
                    blockHash: transactionReceipt.blockHash,
                    status: TransactionStatus.FAILED,
                    success: 'false',
                    actualGasCost: 0,
                    actualGasUsed: 0,
                    reason: 'null',
                    logs: null,
                  },
                );
                log.info(`userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);

                if (transactionType === TransactionType.BUNDLER) {
                  log.info(`updating state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
                  await this.userOperationStateDao.updateState(this.chainId, {
                    transactionId,
                    state: UserOperationStateEnum.FAILED,
                    message: await this.getTransactionFailureMessage(
                      transactionReceipt,
                      entryPointContract,
                    ),
                  });
                  log.info(`updated state to: ${UserOperationStateEnum.FAILED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
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

              log.info(`Transaction got front runned. Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
              await this.publishToTransactionQueue({
                transactionId,
                relayerManagerName,
                transactionHash: (
                  frontRunnedTransactionReceipt as TransactionReceipt
                ).transactionHash,
                receipt: transactionReceipt,
                event: SocketEventType.onTransactionMined,
              });

              log.info(`Updating transaction data for a front runned transaction for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              log.info(`Updating userOp data: ${JSON.stringify({
                receipt: frontRunnedTransactionReceipt,
                transactionHash: (
                  frontRunnedTransactionReceipt as TransactionReceipt
                ).transactionHash,
                blockNumber: (
                  frontRunnedTransactionReceipt as TransactionReceipt
                ).blockNumber,
                blockHash: (
                  frontRunnedTransactionReceipt as TransactionReceipt
                ).blockHash,
                status: TransactionStatus.FAILED,
                success,
                actualGasCost,
                actualGasUsed,
                reason,
                logs,
              })} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);

              await this.userOperationDao.updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
                this.chainId,
                transactionId,
                userOpHash,
                {
                  receipt: frontRunnedTransactionReceipt,
                  transactionHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).transactionHash,
                  blockNumber: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).blockNumber,
                  blockHash: (
                    frontRunnedTransactionReceipt as TransactionReceipt
                  ).blockHash,
                  status: TransactionStatus.FAILED,
                  success,
                  actualGasCost,
                  actualGasUsed,
                  reason,
                  logs,
                },
              );

              log.info(`userOp data updated for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
              let frontRunnedTransactionFee = 0;
              let frontRunnedTransactionFeeInUSD = 0;
              let frontRunnedTransactionFeeCurrency = '';
              if (
                !frontRunnedTransactionReceipt.gasUsed
                && !frontRunnedTransactionReceipt.effectiveGasPrice) {
                log.info(`gasUsed or effectiveGasPrice field not found in ${JSON.stringify(frontRunnedTransactionReceipt)}`);
              } else {
                frontRunnedTransactionFee = Number(frontRunnedTransactionReceipt.gasUsed.mul(
                  frontRunnedTransactionReceipt.effectiveGasPrice,
                ));
                frontRunnedTransactionFeeCurrency = config.chains.currency[this.chainId];
                const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
                if (!coinsRateObj) {
                  log.info('Coins Rate Obj not fetched from cache');
                } else {
                  frontRunnedTransactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId];
                }
              }

              // eslint-disable-next-line max-len
              await this.updateFrontRunnedTransactionDataToDatabaseByTransactionIdAndTransactionHash({
                frontRunnedTransactionHash: frontRunnedTransactionReceipt.hash,
                frontRunnedReceipt: frontRunnedTransactionReceipt,
                frontRunnedTransactionFee,
                frontRunnedTransactionFeeInUSD,
                frontRunnedTransactionFeeCurrency,
                updationTime: Date.now(),
              }, transactionId, transactionExecutionResponse?.hash);

              if (transactionType === TransactionType.BUNDLER) {
                log.info(`updating state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`);
                await this.userOperationStateDao.updateState(this.chainId, {
                  transactionId,
                  transactionHash: frontRunnedTransactionReceipt.hash,
                  message: 'Transaction was front runned, check new transaction hash in receipt',
                  state: UserOperationStateEnum.CONFIRMED,
                });
                log.info(`updated state state to: ${UserOperationStateEnum.CONFIRMED} for userOpHash: ${userOpHash} for transactionId: ${transactionId} on chainId: ${this.chainId} for a front runned transaction`);
              }
            } else {
              log.info(`entryPoint: ${entryPoint} not found in entry point map for transactionId: ${transactionId} on chainId: ${this.chainId}`);
            }
          }
        }
      } catch (error) {
        log.error(`Error in saving userOp data in database for transactionId: ${transactionId} on chainId ${this.chainId} with error: ${parseError(error)}`);
      }

      try {
        log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
        let transactionFee = 0;
        let transactionFeeInUSD = 0;
        let transactionFeeCurrency = '';
        if (!transactionReceipt.gasUsed && !transactionReceipt.effectiveGasPrice) {
          log.info(`gasUsed or effectiveGasPrice field not found in ${JSON.stringify(transactionExecutionResponse)}`);
        } else {
          transactionFee = Number(transactionReceipt.gasUsed
            * transactionReceipt.effectiveGasPrice);
          transactionFeeCurrency = config.chains.currency[this.chainId];
          const coinsRateObj = await this.cacheService.get(getTokenPriceKey());
          if (!coinsRateObj) {
            log.info('Coins Rate Obj not fetched from cache');
          } else {
            transactionFeeInUSD = JSON.parse(coinsRateObj)[this.chainId];
          }
        }
        await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
          receipt: transactionReceipt,
          transactionFee,
          transactionFeeInUSD,
          transactionFeeCurrency,
          status: TransactionStatus.FAILED,
          updationTime: Date.now(),
        }, transactionId, transactionExecutionResponse?.hash);
      } catch (error) {
        log.error(`Error in saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId} with error: ${parseError(error)}`);
      }
    } else {
      log.info(`No transactionExecutionResponse found for transactionId: ${transactionId} on chainId ${this.chainId}`);
    }
  }

  private async updateTransactionDataToDatabase(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionId(
      this.chainId,
      transactionId,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async saveNewTransactionDataToDatabase(
    newTransactionDataToBeSavedInDatabase: NewTransactionDataToBeSavedInDatabaseType,
  ): Promise<void> {
    await this.transactionDao.save(
      this.chainId,
      newTransactionDataToBeSavedInDatabase,
    );
  }

  private async updateTransactionDataToDatabaseByTransactionIdAndTransactionHash(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
    transactionHash: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionIdAndTransactionHash(
      this.chainId,
      transactionId,
      transactionHash,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async updateFrontRunnedTransactionDataToDatabaseByTransactionIdAndTransactionHash(
    // eslint-disable-next-line max-len
    frontRunnedTransactionDataToBeUpdatedInDatabase: FrontRunnedTransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
    transactionHash: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionIdAndTransactionHashForFrontRunnedTransaction(
      this.chainId,
      transactionId,
      transactionHash,
      frontRunnedTransactionDataToBeUpdatedInDatabase,
    );
  }

  private async updateTransactionDataForFailureInTransactionExecution(
    transactionId: string,
  ): Promise<void> {
    this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
      resubmitted: false,
      status: TransactionStatus.DROPPED,
      updationTime: Date.now(),
    }, transactionId, TransactionStatus.DROPPED);
  }

  private async updateUserOpDataForFailureInTransactionExecution(
    transactionId: string,
  ): Promise<void> {
    const userOps = await this.userOperationDao.getUserOpsByTransactionId(
      this.chainId,
      transactionId,
    );
    log.info(`userOps: ${JSON.stringify(userOps)} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
    if (!userOps.length) {
      log.info(`No user op found for transactionId: ${transactionId} on chainId: ${this.chainId}`);
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
          blockNumber: BigInt(0),
          blockHash: 'null',
          status: TransactionStatus.DROPPED,
          success: 'false',
          actualGasCost: 0,
          actualGasUsed: 0,
          reason: 'null',
          logs: null,
        },
      );
    }
  }

  private async waitForTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    const {
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      previousTransactionHash,
      walletAddress,
      metaData,
      transactionType,
      relayerManagerName,
    } = notifyTransactionListenerParams;
    if (!transactionExecutionResponse) {
      return;
    }
    // TODO : add error check
    const transactionHash = transactionExecutionResponse.hash;
    log.info(`Transaction hash is: ${transactionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    const transactionReceipt = await this.networkService.waitForTransaction(
      transactionHash,
      undefined,
      // timeout is set to 1.5 times because it ensures that transaction would
      // have resubmitted and no need to keep polling it
      Number(1.5 * config.chains.retryTransactionInterval[this.chainId]),
    );

    log.info(`Transaction receipt is: ${JSON.stringify(transactionReceipt)} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    // TODO: reduce pending count of relayer via RelayerManager
    await this.cacheService.delete(getRetryTransactionCountKey(transactionId, this.chainId));

    await this.cacheService.set(getTransactionMinedKey(transactionId), '1');

    if (transactionReceipt.status === 'success') {
      log.info(`Transaction is a success for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionSuccess({
        transactionExecutionResponse,
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
    if (transactionReceipt.status === 'reverted') {
      log.info(`Transaction is a failure for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionFailure({
        transactionExecutionResponse,
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
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<TransactionListenerNotifyReturnType> {
    const {
      transactionExecutionResponse,
      transactionId,
      rawTransaction,
      relayerAddress,
      transactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      previousTransactionHash,
      error,
    } = notifyTransactionListenerParams;

    // if no transactionExecutionResponse then it means transactions was not published onc hain
    // update transaction and user op collection
    if (!transactionExecutionResponse || Object.keys(transactionExecutionResponse).length === 0) {
      log.error(`transactionExecutionResponse is null for transactionId: ${transactionId} for bundler: ${relayerAddress} hence 
      updating transaction and userOp data`);
      try {
        if (transactionType === TransactionType.BUNDLER || transactionType === TransactionType.AA) {
          this.updateTransactionDataForFailureInTransactionExecution(transactionId);
          this.updateUserOpDataForFailureInTransactionExecution(transactionId);
        }
      } catch (dataSavingError) {
        log.error(`Error in updating transaction and userOp data for transactionId: ${transactionId} with error: ${parseError(dataSavingError)}`);
      }
      await this.publishToTransactionQueue({
        transactionId,
        relayerManagerName,
        error,
        event: SocketEventType.onTransactionError,
      });
      log.error(`transactionExecutionResponse is null for transactionId: ${transactionId} for bundler: ${relayerAddress}`);
      return {
        isTransactionRelayed: false,
        transactionExecutionResponse: null,
      };
    }

    if (!previousTransactionHash) {
    // Save initial transaction data to database
      this.updateTransactionDataToDatabase({
        transactionHash: transactionExecutionResponse.hash,
        rawTransaction: transactionExecutionResponse,
        relayerAddress,
        gasPrice: transactionExecutionResponse.gasPrice,
        status: TransactionStatus.PENDING,
        updationTime: Date.now(),
      }, transactionId);
    } else {
      this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        resubmitted: true,
        status: TransactionStatus.DROPPED,
        updationTime: Date.now(),
      }, transactionId, previousTransactionHash);
      this.saveNewTransactionDataToDatabase({
        transactionId,
        transactionType,
        transactionHash: transactionExecutionResponse.hash,
        previousTransactionHash,
        status: TransactionStatus.PENDING,
        rawTransaction: transactionExecutionResponse,
        chainId: this.chainId,
        gasPrice: transactionExecutionResponse.gasPrice,
        relayerAddress,
        walletAddress,
        metaData,
        resubmitted: false,
        creationTime: Date.now(),
        updationTime: Date.now(),
      });
    }

    // transaction queue is being listened by socket service to notify the client about the hash
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: undefined,
      event: previousTransactionHash
        ? SocketEventType.onTransactionHashChanged : SocketEventType.onTransactionHashGenerated,
    });
    // retry txn service will check for receipt
    log.info(`Publishing transaction data of transactionId: ${transactionId} to retry transaction queue on chainId ${this.chainId}`);
    await this.publishToRetryTransactionQueue({
      relayerAddress,
      transactionType,
      transactionHash: transactionExecutionResponse.hash,
      transactionId,
      rawTransaction: rawTransaction as EVMRawTransactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      event: SocketEventType.onTransactionHashGenerated,
    });

    // wait for transaction
    try {
      this.waitForTransaction(notifyTransactionListenerParams);
    } catch (waitForTransactionError) {
      // timeout error
      // do nothing for now just log
      log.error(`Error: ${parseError(waitForTransactionError)} Timeout hit for waiting on hash: ${transactionExecutionResponse.hash} for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return {
        isTransactionRelayed: false,
        transactionExecutionResponse,
      };
    }

    return {
      isTransactionRelayed: true,
      transactionExecutionResponse,
    };
  }

  async getTransactionFailureMessage(
    receipt: TransactionReceipt,
    entryPointContract: EntryPointContractType,
  ): Promise<string> {
    try {
      const getTransactionResponse = await this.networkService.getTransaction(
        receipt.transactionHash,
      );

      const {
        from, to, input, gasPrice,
      } = getTransactionResponse;

      const gasInHex = toHex(receipt.gasUsed).substring(2).replace(/^0+/, '');
      const gasPriceInHex = toHex(gasPrice as bigint).substring(2).replace(/^0+/, '');

      const handleOpResult = await this.networkService.ethCall(
        [{
          from,
          to,
          data: input,
          gas: gasInHex,
          gasPrice: gasPriceInHex,
        }],
      );

      const ethCallData = handleOpResult.data.error.data;
      log.info(`ethCallData: ${ethCallData}`);

      const errorDescription = decodeErrorResult({
        abi: entryPointContract.abi,
        data: ethCallData,
      });
      const { args } = errorDescription;

      if (errorDescription.errorName === 'FailedOp') {
        const revertReason = args[0];
        return `Transaction failed on chain with reason: ${revertReason}`;
      }
      return 'Unable to parse transaction failure reason, please check transaction hash on explorer';
    } catch (error) {
      return 'Unable to parse transaction failure reason, please check transaction hash on explorer';
    }
  }
}
