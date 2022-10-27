/* eslint-disable no-await-in-loop */
import { Mutex } from 'async-mutex';
import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import hdkey from 'hdkey';
import { IGasPrice } from '../../../../common/gas-price';
import { GasPriceType } from '../../../../common/gas-price/types';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType, TransactionType } from '../../../../common/types';
import { config } from '../../../../config';
import { generateTransactionId } from '../../../../server/src/utils/tx-id-generator';
import { EVMAccount, IEVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { EVMRelayerMetaDataType, IRelayerQueue } from '../relayer-queue';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRelayerManager } from './interface/IRelayerManager';
import { EVMRelayerManagerServiceParamsType } from './types';

const log = logger(module);

const fundRelayerMutex = new Mutex();
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

export class EVMRelayerManager implements IRelayerManager<IEVMAccount, EVMRawTransactionType> {
  name: string;

  chainId: number;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  private minRelayerCount: number;

  private maxRelayerCount: number;

  private inactiveRelayerCountThreshold: number;

  private pendingTransactionCountThreshold: number;

  newRelayerInstanceCount: number;

  fundingBalanceThreshold: ethers.BigNumber;

  fundingRelayerAmount: number;

  relayerSeed: string;

  ownerAccountDetails: IEVMAccount;

  gasLimitMap: {
    [key: number]: number
  };

  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>;

  relayerMap: Record<string, IEVMAccount> = {};

  transactionProcessingRelayerMap: Record<string, EVMRelayerMetaDataType> = {};

  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  gasPriceService: IGasPrice;

  constructor(
    evmRelayerManagerServiceParams: EVMRelayerManagerServiceParamsType,
  ) {
    const {
      options, networkService, gasPriceService, nonceManager, relayerQueue, transactionService,
    } = evmRelayerManagerServiceParams;
    this.chainId = options.chainId;
    this.name = options.name;
    this.minRelayerCount = options.minRelayerCount;
    this.maxRelayerCount = options.maxRelayerCount;
    this.inactiveRelayerCountThreshold = options.inactiveRelayerCountThreshold;
    this.pendingTransactionCountThreshold = options.pendingTransactionCountThreshold;
    this.newRelayerInstanceCount = options.newRelayerInstanceCount;
    this.fundingBalanceThreshold = options.fundingBalanceThreshold;
    this.fundingRelayerAmount = options.fundingRelayerAmount;
    this.ownerAccountDetails = options.ownerAccountDetails;
    this.relayerSeed = options.relayerSeed;
    this.gasLimitMap = options.gasLimitMap;
    this.relayerQueue = relayerQueue;
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.transactionService = transactionService;
    this.nonceManager = nonceManager;
  }

  async getActiveRelayer(): Promise<IEVMAccount | null> {
    const activeRelayer = await this.relayerQueue.pop();
    if (activeRelayer) {
      this.transactionProcessingRelayerMap[activeRelayer.address] = activeRelayer;
      return this.relayerMap[activeRelayer.address];
    }
    return null;
  }

  async addActiveRelayer(address: string): Promise<void> {
    log.info(`Adding relayer: ${address} to active relayer map on chainId: ${this.chainId}`);
    const relayer = this.transactionProcessingRelayerMap[address];
    if (relayer) {
      await this.relayerQueue.push(relayer);
      delete this.transactionProcessingRelayerMap[address];
      log.info(`Relayer ${address} added to active relayer map on chainId: ${this.chainId}`);
    } else {
      log.error(`Relayer ${address} not found in processing relayer map on chainId: ${this.chainId}`);
    }
  }

  // get total number of relayers
  getRelayersCount(active: boolean = false): number {
    if (active) {
      return this.relayerQueue.size();
    }
    return Object.keys(this.transactionProcessingRelayerMap).length
      + this.relayerQueue.size();
  }

  // return list of created list of relayers address
  async createRelayers(numberOfRelayers: number = this.minRelayerCount): Promise<string[]> {
    log.info(`Waiting for lock to create relayers on chainId: ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on chainId ${this.chainId}`);
    const relayersMasterSeed = this.ownerAccountDetails.getPublicKey();
    const relayers: IEVMAccount[] = [];
    const relayersAddressList: string[] = [];
    try {
      const index = this.getRelayersCount();
      for (let relayerIndex = index; relayerIndex < index + numberOfRelayers; relayerIndex += 1) {
        const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
        const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

        const { nodePathIndex } = config.relayer;
        const nodePath = `${nodePathRoot + nodePathIndex}/`;
        const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
        const privateKey = ethNodePath._privateKey.toString('hex');
        const ethPubkey = privateToPublic(ethNodePath.privateKey);

        const ethAddr = publicToAddress(ethPubkey).toString('hex');
        const ethAddress = toChecksumAddress(`0x${ethAddr}`);
        const address = ethAddress.toLowerCase();
        const relayer = new EVMAccount(
          address,
          privateKey,
        );
        this.relayerMap[address] = relayer;
        relayers.push(relayer);
      }

      for (const relayer of relayers) {
        const relayerAddress = relayer.getPublicKey().toLowerCase();
        try {
          const balance = await this.networkService.getBalance(relayerAddress);
          const nonce = await this.nonceManager.getNonce(relayerAddress);
          this.relayerQueue.push({
            address: relayer.getPublicKey(),
            pendingCount: 0,
            nonce,
            balance,
          });
          relayersAddressList.push(relayerAddress);
        } catch (error) {
          log.error(error);
          log.info(`Error while getting balance and nonce for relayer ${relayerAddress} on chainId: ${this.chainId}`);
        }
      }
    } catch (error) {
      log.error(`failed to create relayers ${JSON.stringify(error)} on chainId: ${this.chainId}`);
    }

    release();
    log.info(`Lock released after creating relayers on chainId: ${this.chainId}`);
    return relayersAddressList;
  }

  hasBalanceBelowThreshold(address: string): boolean {
    const relayerData = this.relayerQueue.list().find((relayer) => relayer.address === address);
    if (relayerData) {
      const relayerBalance = relayerData.balance;
      log.info(`Relayer ${address} balance is ${relayerBalance} on chainId: ${this.chainId}`);
      if (relayerBalance.lte(this.fundingBalanceThreshold)) {
        return true;
      }
    }
    return false;
  }

  async fundRelayers(addressList: string[]): Promise<any> {
    log.info(`Waiting for lock to fund relayers on chainId: ${this.chainId}`);
    for (const address of addressList) {
      const release = await fundRelayerMutex.acquire();
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(`Has sufficient funds in relayer ${address} on chainId: ${this.chainId}`);
      } else {
        // eslint-disable-next-line no-await-in-loop
        log.info(`Funding relayer ${address} on chainId: ${this.chainId}`);
        let gasLimitIndex = 0;
        // different gas limit for arbitrum
        if ([42161, 421611].includes(this.chainId)) gasLimitIndex = 1;

        const gasLimit = this.gasLimitMap[gasLimitIndex];

        const fundingAmount = this.fundingRelayerAmount;

        const ownerAccountNonce = await this.nonceManager.getNonce(
          this.ownerAccountDetails.getPublicKey(),
        );
        const gasPrice = await this.gasPriceService.getGasPrice(GasPriceType.DEFAULT);
        const rawTx = {
          from: this.ownerAccountDetails.getPublicKey(),
          data: '0x',
          gasPrice: ethers.BigNumber.from(gasPrice).toHexString(),
          gasLimit: ethers.BigNumber.from(
            gasLimit.toString(),
          ).toHexString(),
          to: address,
          value: ethers.utils.parseEther(fundingAmount.toString()).toHexString(),
          nonce: ethers.BigNumber.from(ownerAccountNonce.toString()).toHexString(),
          chainId: this.chainId,
        };
        const transactionId = generateTransactionId(JSON.stringify(rawTx));
        log.info(`Funding relayer ${address} on chainId: ${this.chainId} with raw tx ${JSON.stringify(rawTx)}`);
        await this.transactionService.sendTransaction({
          ...rawTx, transactionId,
        }, this.ownerAccountDetails, TransactionType.FUNDING);
      }
      release();
    }
  }

  setMinRelayerCount(minRelayerCount: number) {
    this.minRelayerCount = minRelayerCount;
  }

  getMinRelayerCount(): number {
    return this.minRelayerCount;
  }

  setMaxRelayerCount(maxRelayerCount: number) {
    this.maxRelayerCount = maxRelayerCount;
  }

  getMaxRelayerCount(): number {
    return this.maxRelayerCount;
  }

  setInactiveRelayerCountThreshold(threshold: number) {
    this.inactiveRelayerCountThreshold = threshold;
  }

  getInactiveRelayerCountThreshold() {
    return this.inactiveRelayerCountThreshold;
  }

  setPendingTransactionCountThreshold(threshold: number) {
    this.pendingTransactionCountThreshold = threshold;
  }

  getPendingTransactionCountThreshold() {
    return this.pendingTransactionCountThreshold;
  }
}
