/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { Mutex } from "async-mutex";
import {
  privateToPublic,
  publicToAddress,
  toChecksumAddress,
} from "ethereumjs-util";
import hdkey from "hdkey";
import { parseEther, toHex } from "viem";
import { ICacheService } from "../../common/cache";
import { IGasPriceService } from "../../common/gas-price";
import { logger } from "../../common/logger";
import { getPendingTransactionIncreasingMessage } from "../../common/notification";
import { INotificationManager } from "../../common/notification/interface";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../common/types";
import {
  customJSONStringify,
  generateTransactionId,
  getFailedTransactionRetryCountKey,
  parseError,
} from "../../common/utils";
import { config } from "../../common/config";
import { EVMAccount, IEVMAccount } from "../account";
import { INonceManager } from "../nonce-manager";
import { EVMRelayerMetaDataType, IRelayerQueue } from "../relayer-queue";
import { ITransactionService } from "../transaction-service/interface/ITransactionService";
import { IRelayerManager } from "./interface/IRelayerManager";
import { EVMRelayerManagerServiceParamsType } from "./types";
import { INetworkService } from "../network";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const createRelayerMutex = new Mutex();
const nodePathRoot = "m/44'/60'/0'/";

/**
 * Function of relayer manager
 * 1. create relayers for supported networks
 * 2. fund relayer for the first time from main account
 * 4. maintain state of relayer and choose from the algo when transactions are happening
 * 5. Update balance, nonce, check thresholds
 * 6. increase number of relayer if load
 * 7. fee manager interaction with relayer manager
 * Convert either from main account or convert per relayer
 */

export class EVMRelayerManager
  implements
    IRelayerManager<
      IEVMAccount,
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >
{
  chainId: number;

  cacheService: ICacheService;

  transactionService: ITransactionService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>;

  relayerMap: Record<string, IEVMAccount> = {};

  transactionProcessingRelayerMap: Record<string, EVMRelayerMetaDataType> = {};

  nonceManager: INonceManager<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  gasPriceService: IGasPriceService;

  notificationManager: INotificationManager;

  constructor(
    evmRelayerManagerServiceParams: EVMRelayerManagerServiceParamsType,
  ) {
    const {
      networkService,
      gasPriceService,
      cacheService,
      nonceManager,
      relayerQueue,
      transactionService,
      notificationManager,
    } = evmRelayerManagerServiceParams;
    this.chainId = networkService.chainId;
    this.relayerQueue = relayerQueue;
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.transactionService = transactionService;
    this.nonceManager = nonceManager;
    this.cacheService = cacheService;
    this.notificationManager = notificationManager;
  }

  private async sendPendingTransactionIncreasingSlackNotification(
    relayerAddress: string,
    pendingCount: number,
  ) {
    const pendingTransactionIncreasingMessage =
      getPendingTransactionIncreasingMessage(
        relayerAddress,
        this.chainId,
        pendingCount,
      );
    const slackNotifyObject = this.notificationManager.getSlackNotifyObject(
      pendingTransactionIncreasingMessage,
    );
    await this.notificationManager.sendSlackNotification(slackNotifyObject);
  }

  /**
   * Fetches active relayer from the queue
   * @returns An active relayer instance
   */
  async getActiveRelayer(): Promise<IEVMAccount | null> {
    const activeRelayer = await this.relayerQueue.pop();
    if (activeRelayer) {
      activeRelayer.pendingCount += 1;
      this.transactionProcessingRelayerMap[
        activeRelayer.address.toLowerCase()
      ] = activeRelayer;
      if (
        activeRelayer.pendingCount >
        config.relayerManager.pendingTransactionCountThreshold - 5
      ) {
        // await this.sendPendingTransactionIncreasingSlackNotification(
        //   activeRelayer.address,
        //   activeRelayer.pendingCount,
        // );
      }
      return this.relayerMap[activeRelayer.address];
    }
    return null;
  }

  /**
   * Once a transaction is mined, the method decreases relayer's pending count,
   * updates the balance and checks if funding is required for that relayer
   * @param relayerAddress
   */
  async postTransactionMined(relayerAddress: string): Promise<void> {
    const address = relayerAddress.toLowerCase() as `0x${string}`;
    log.info(
      `postTransactionMined called for relayer: ${address} on chainId: ${this.chainId}`,
    );
    let relayerData = this.relayerQueue
      .list()
      .find((relayer) => relayer.address === address);

    log.info(
      `relayerQueue consists: ${customJSONStringify(this.relayerQueue.list())}`,
    );
    log.info(
      `Relayer: ${address} on chainId: ${
        this.chainId
      } with data: ${customJSONStringify(relayerData)} from relayerQueue`,
    );

    if (!relayerData) {
      // if relayer is performing transaction then it would not be available in relayer queue
      log.info(
        `transactionProcessingRelayerMap consists: ${customJSONStringify(
          this.transactionProcessingRelayerMap,
        )}`,
      );
      relayerData = this.transactionProcessingRelayerMap[address];
      log.info(
        `Relayer: ${address} on chainId: ${
          this.chainId
        } with data: ${customJSONStringify(
          relayerData,
        )} from transactionProcessingRelayerMap`,
      );
    }
    if (relayerData) {
      log.info(
        `Reducing pending count for relayer: ${address} on chainId: ${this.chainId}`,
      );
      if (relayerData.pendingCount > 0) {
        relayerData.pendingCount -= 1;
      }
      log.info(
        `Pending count of relayer ${address} is ${relayerData.pendingCount} on chainId: ${this.chainId}`,
      );
      const balance = await this.networkService.getBalance(address);
      relayerData.balance = Number(balance);
      log.info(
        `Balance of relayer ${address} is ${balance} on chainId: ${this.chainId}`,
      );
      this.relayerQueue.set(relayerData);
      // if balance is less than threshold, fund the relayer
      if (
        balance <= config.relayerManager.fundingBalanceThreshold[this.chainId]
      ) {
        log.info(
          `Balance of relayer ${address} is less than threshold ${config.relayerManager.fundingBalanceThreshold[this.chainId]} on chainId: ${this.chainId}`,
        );
        try {
          await this.fundRelayers([address]);
        } catch (error) {
          log.error(
            `Error while funding relayer ${address} on chainId: ${
              this.chainId
            }: ${parseError(error)}`,
          );
        }
      }
    } else {
      log.info(
        `Relayer ${address} is not found in relayer queue or transaction processing relayer map on chainId: ${this.chainId}`,
      );
    }
  }

  /**
   * Method adds active relayer active relayer queue
   * @param relayerAddress
   */
  async addActiveRelayer(relayerAddress: string): Promise<void> {
    const address = relayerAddress.toLowerCase();
    log.info(
      `Adding relayer: ${address} to active relayer map on chainId: ${this.chainId}`,
    );
    const relayer = this.transactionProcessingRelayerMap[address];
    if (relayer) {
      // check if pending count of relayer is less than threshold
      // else you wait for the transaction to be mined
      log.info(
        `For relayer: ${relayer.address} pendingCount: ${relayer.pendingCount} pendingTransactionCountThreshold: ${config.relayerManager.pendingTransactionCountThreshold} on chainId: ${this.chainId}`,
      );
      await this.relayerQueue.push(relayer);
      // TODO: uncomment below code once we have a way to check if transaction is mined
      // if (relayer.pendingCount < this.pendingTransactionCountThreshold) {
      //   await this.relayerQueue.push(relayer);
      // }
      delete this.transactionProcessingRelayerMap[address];

      // check if size of active relayer queue is
      // greater than or equal to the inactiveRelayerCountThreshold
      // TODO: This will never be executed, check if we need to enable this
      if (
        config.relayerManager.minRelayerCount[this.chainId] -
          this.relayerQueue.size() >=
        config.relayerManager.inactiveRelayerCountThreshold[this.chainId]
      ) {
        log.info(
          `Creating ${config.relayerManager.newRelayerInstanceCount[this.chainId]} new relayers on chainId: ${this.chainId}`,
        );
        const newRelayers = await this.createRelayers(
          config.relayerManager.newRelayerInstanceCount[this.chainId],
        );
        await this.fundRelayers(newRelayers);
      }
      log.info(
        `Relayer ${address} added to active relayer map on chainId: ${this.chainId}`,
      );
    } else {
      log.error(
        `Relayer ${address} not found in processing relayer map on chainId: ${this.chainId}`,
      );
    }
  }

  /**
   * Method creates relayers at run time basis on config values
   * @param numberOfRelayers number of relayers to create, default set to value set in config
   * @returns List of addresses of newly created relayers
   */
  async createRelayers(
    numberOfRelayers: number = config.relayerManager.minRelayerCount[
      this.chainId
    ],
  ): Promise<`0x${string}`[]> {
    log.info(`Waiting for lock to create relayers on chainId: ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on chainId ${this.chainId}`);
    const relayersMasterSeed = config.relayerManager.relayerSeed;
    const relayers: IEVMAccount[] = [];
    const relayersAddressList: `0x${string}`[] = [];
    try {
      const index = Object.keys(this.relayerMap).length;
      for (
        let relayerIndex = index;
        relayerIndex < index + numberOfRelayers;
        relayerIndex += 1
      ) {
        const seedInBuffer = Buffer.from(relayersMasterSeed, "utf-8");
        const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

        const nodePathIndex =
          process.env.BUNDLER_NODE_PATH_INDEX || config.relayer.nodePathIndex;
        const nodePath = `${nodePathRoot + nodePathIndex}/`;
        const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
        const privateKey = ethNodePath._privateKey.toString("hex");
        const ethPubkey = privateToPublic(ethNodePath.privateKey);

        const ethAddr = publicToAddress(ethPubkey).toString("hex");
        const ethAddress = toChecksumAddress(`0x${ethAddr}`);
        const address = ethAddress.toLowerCase();
        const relayer = new EVMAccount(
          address,
          privateKey,
          this.networkService.chainId,
        );
        this.relayerMap[address] = relayer;
        relayers.push(relayer);
      }

      for (const relayer of relayers) {
        const relayerAddress = relayer
          .getPublicKey()
          .toLowerCase() as `0x${string}`;
        try {
          log.info(
            `Creating relayer ${relayerAddress} on chainId: ${this.chainId}`,
          );
          const balance = Number(
            toHex(await this.networkService.getBalance(relayerAddress)),
          );
          const nonce = await this.nonceManager.getNonce(relayerAddress);
          log.info(
            `Balance of relayer ${relayerAddress} is ${balance} and nonce is ${nonce} on chainId: ${this.chainId} with threshold ${config.relayerManager.fundingBalanceThreshold[this.chainId]}`,
          );
          this.relayerQueue.push({
            address: relayer.getPublicKey().toLowerCase(),
            pendingCount: 0,
            nonce,
            balance,
          });
          relayersAddressList.push(relayerAddress);
        } catch (error) {
          log.error(parseError(error));
          log.info(
            `Error while getting balance and nonce for relayer ${relayerAddress} on chainId: ${this.chainId}`,
          );
        }
      }
    } catch (error) {
      log.error(
        `failed to create relayers ${customJSONStringify(error)} on chainId: ${
          this.chainId
        }`,
      );
    }

    release();
    log.info(
      `Lock released after creating relayers on chainId: ${this.chainId}`,
    );
    return relayersAddressList;
  }

  /**
   * Method checks if balance of relayer is below threshold or not
   * @param relayerAddress
   * @returns returns true or false basis on balance of relayer
   */
  hasBalanceBelowThreshold(relayerAddress: string): boolean {
    const address = relayerAddress.toLowerCase();
    const relayerData = this.relayerQueue
      .list()
      .find((relayer) => relayer.address === address);
    if (relayerData) {
      const relayerBalance = BigInt(relayerData.balance);
      log.info(
        `Relayer ${address} balance is ${relayerBalance} on chainId: ${this.chainId}`,
      );
      if (
        relayerBalance <=
        config.relayerManager.fundingBalanceThreshold[this.chainId]
      ) {
        log.info(
          `Relayer ${address} balance ${relayerBalance} is below threshold of ${config.relayerManager.fundingBalanceThreshold[this.chainId]} on chainId: ${this.chainId}`,
        );
        return true;
      }
    } else {
      log.error(
        `Relayer ${address} not found in relayer queue on chainId: ${this.chainId}`,
      );
    }
    return false;
  }

  /**
   * Method funds the relayers basis on config values
   * @param addressList List of relayers to fund
   */
  async fundRelayers(addressList: `0x${string}`[]): Promise<any> {
    log.info(
      `Starting to fund relayers on chainId: ${this.chainId} with addresses: ${addressList}`,
    );
    for (const relayerAddress of addressList) {
      const address = relayerAddress.toLowerCase() as `0x${string}`;
      const lock = this.cacheService.getRedLock();
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(
          `Has sufficient funds in relayer ${address} on chainId: ${this.chainId}`,
        );
      } else if (lock) {
        const key = `${config.relayerManager.ownerAddress}_${this.chainId}`;
        log.info(
          `Waiting for lock to fund relayers on key ${key} for relayer ${relayerAddress} for duration of 1000 ms`,
        );
        const acquiredLock = await lock.acquire([`locks:${key}`], 10000);
        log.info(
          `Lock acquired on key ${key} to fund relayer ${relayerAddress} on chainId: ${this.chainId}`,
        );
        try {
          let gasLimitIndex = 0;
          // different gas limit for arbitrum
          if (config.l2Networks.includes(this.chainId)) gasLimitIndex = 1;

          if (config.mantleNetworks.includes(this.chainId)) gasLimitIndex = 3;

          const gasLimit = config.fundingTransactionGasLimitMap[gasLimitIndex];

          const fundingAmount =
            config.relayerManager.fundingRelayerAmount[this.chainId];

          const partialRawTransaction = {
            from: config.relayerManager.ownerAddress,
            data: "0x" as `0x${string}`,
            gasLimit: BigInt(gasLimit),
            to: address,
            value: parseEther(fundingAmount.toString()),
            chainId: this.chainId,
          };

          const transactionId = generateTransactionId(Date.now().toString());
          log.info(
            `Funding relayer ${address} on chainId: ${
              this.chainId
            } with partialRawTransaction ${customJSONStringify(
              partialRawTransaction,
            )} with transactionId: ${transactionId}`,
          );
          // TODO set expiry
          await this.cacheService.set(
            getFailedTransactionRetryCountKey(transactionId, this.chainId),
            "0",
          );

          const ownerAccount = new EVMAccount(
            config.relayerManager.ownerAddress,
            config.relayerManager.ownerPrivateKey,
            this.chainId,
          );

          await this.transactionService.relayTransaction(
            partialRawTransaction,
            transactionId,
            ownerAccount,
          );
          await this.cacheService.unlockRedLock(acquiredLock);
          log.info(
            `Lock released for relayer ${address} on chainId: ${this.chainId}`,
          );
          log.info(
            `Funding relayer ${address} on chainId: ${this.chainId} completed successfully`,
          );
          // TODO move this getFailedTransactionRetryCountKey key in the transaction service
          await this.cacheService.delete(
            getFailedTransactionRetryCountKey(transactionId, this.chainId),
          );
        } catch (error) {
          await this.cacheService.unlockRedLock(acquiredLock);
          log.error(
            `Error while funding relayer ${address} on chainId: ${
              this.chainId
            } with error: ${parseError(error)}`,
          );
        }
      } else {
        log.error(
          `Lock undefined and hence failed to fund relayer ${address} on chainId: ${this.chainId}`,
        );
      }
    }
  }

  /**
   * Method funds and adds relayer to active queue
   * @param address of relayer
   */
  async fundAndAddRelayerToActiveQueue(address: `0x${string}`): Promise<void> {
    try {
      log.info(`Funding relayer: ${address} on chainId: ${this.chainId}`);
      await this.fundRelayers([address]);
      log.info(`Relayer: ${address} funded on chainId: ${this.chainId}`);

      log.info(
        `Adding relayer: ${address} to active queue on chainId: ${this.chainId}`,
      );
      await this.addActiveRelayer(address);
      log.info(
        `Relayer: ${address} added to active queue on chainId: ${this.chainId}`,
      );
    } catch (error) {
      log.error(
        `Error in funding and adding relayer to active queue: ${parseError(
          error,
        )}`,
      );
    }
  }
}
