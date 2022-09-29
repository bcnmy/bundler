/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
import { Mutex } from 'async-mutex';
import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import hdkey from 'hdkey';
import { IGasPrice } from '../../../../common/gas-price';
import { GasPriceType } from '../../../../common/gas-price/types';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { config } from '../../../../config';
import { EVMAccount, IEVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRelayerManager } from './interface/IRelayerManager';
import { SortEVMRelayerByLeastPendingCount } from './strategy';
import { StrategyManager } from './strategy/StrategyManager';
import { EVMRelayerDataType, EVMRelayerManagerServiceParamsType } from './types';

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

export class EVMRelayerManager implements IRelayerManager<EVMAccount> {
  name: string;

  chainId: number;

  transactionService: ITransactionService<EVMAccount>;

  minRelayerCount: number;

  maxRelayerCount: number;

  inactiveRelayerCountThreshold: number;

  pendingTransactionCountThreshold: number;

  newRelayerInstanceCount: number;

  fundingBalanceThreshold: number;

  fundingRelayerAmount: number;

  ownerAccountDetails: {
    [key: number]: {
      publicKey: string,
      privateKey: string,
    }
  };

  gasLimitMap: {
    [key: number]: number
  };

  activeRelayerData: Array<EVMRelayerDataType> = [];

  relayerMap: Record<string, EVMAccount> = {};

  processingTransactionRelayerDataMap: Record<string, EVMRelayerDataType> = {};

  nonceManager: INonceManager;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  gasPriceService: IGasPrice;

  constructor(
    evmRelayerManagerServiceParams: EVMRelayerManagerServiceParamsType,
  ) {
    const {
      options, networkService, gasPriceService, transactionService, nonceManager,
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
    this.gasLimitMap = options.gasLimitMap;
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.transactionService = transactionService;
    this.nonceManager = nonceManager;
  }

  getActiveRelayer(): EVMAccount | null {
    const strategy = new StrategyManager(
      new SortEVMRelayerByLeastPendingCount(this.activeRelayerData),
    );
    strategy.performAlgorithm();
    const activeRelayer = this.activeRelayerData.pop();
    if (activeRelayer) {
      this.processingTransactionRelayerDataMap[activeRelayer.address] = activeRelayer;
      return this.relayerMap[activeRelayer.address];
    }
    return null;
  }

  addActiveRelayer(address: string): void {
    if (this.processingTransactionRelayerDataMap[address]) {
      this.activeRelayerData.push(this.processingTransactionRelayerDataMap[address]);
      console.log(`Relayer ${address} added to active relayer map`);
    }
  }

  // get total number of relayers
  getRelayersCount(active: boolean = false): number {
    if (active) {
      return this.activeRelayerData.length;
    }
    return Object.keys(this.processingTransactionRelayerDataMap).length
      + this.activeRelayerData.length;
  }

  async createRelayers(numberOfRelayers: number): Promise<void> {
    log.info(`Waiting for lock to create relayers on ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.chainId}`);
    const relayersMasterSeed = this.ownerAccountDetails[this.chainId].privateKey;
    const relayers: EVMAccount[] = [];

    try {
      const index = this.getRelayersCount();
      for (let relayerIndex = index; relayerIndex <= index + numberOfRelayers; relayerIndex += 1) {
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

      log.info(`Relayers created on network id ${this.chainId}`);
      relayers.map(async (relayer) => {
        const relayerAddress = relayer.getPublicKey().toLowerCase();
        const balance = await (await this.networkService.getBalance(relayerAddress)).toNumber();
        const nonce = await this.nonceManager.getNonce(relayerAddress);
        this.activeRelayerData.push({
          address: relayer.getPublicKey(),
          pendingCount: 0,
          nonce,
          balance,
        });
      });
    } catch (error) {
      log.error(`failed to create relayers ${JSON.stringify(error)} on network id ${this.chainId}`);
    }

    release();
    log.info(`Lock released after creating relayers on ${this.chainId}`);
  }

  hasBalanceBelowThreshold(address: string): boolean {
    const relayerData = this.activeRelayerData.find((relayer) => relayer.address === address);
    const relayerBalance = relayerData?.balance || 0;
    if (relayerBalance < this.fundingBalanceThreshold) {
      return true;
    }
    return false;
  }

  async fundRelayers(ownerAccount: EVMAccount, addressList: string[]): Promise<any> {
    log.info(`Waiting for lock to fund relayers on ${this.chainId}`);
    for (const address of addressList) {
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(`Has sufficient funds in relayer ${address} on network id ${this.chainId}`);
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      const release = await fundRelayerMutex.acquire();
      log.info(`Funding relayer ${address} on network id ${this.chainId}`);
      let gasLimitIndex = 0;
      // different gas limit for arbitrum
      if ([42161, 421611].includes(this.chainId)) gasLimitIndex = 1;

      const gasLimit = this.gasLimitMap[gasLimitIndex];

      const fundingAmount = this.fundingRelayerAmount;

      const ownerAccountNonce = await this.nonceManager.getNonce(
        ownerAccount.getPublicKey(),
      );
      const gasPrice = await this.gasPriceService.getGasPrice(GasPriceType.DEFAULT);
      const rawTx: any = {
        from: ownerAccount.getPublicKey(),
        gasPrice: ethers.BigNumber.from(gasPrice).toHexString(),
        gasLimit: ethers.BigNumber.from(
          gasLimit.toString(),
        ).toHexString(),
        to: address,
        value: ethers.utils.parseEther(fundingAmount.toString()).toHexString(),
        nonce: ethers.BigNumber.from(ownerAccountNonce.toString()).toHexString(),
        chainId: this.chainId,
      };
      log.info(`Funding relayer ${address} on network id ${this.chainId} with raw tx ${JSON.stringify(rawTx)}`);
      await this.transactionService.sendTransaction(rawTx, ownerAccount);
      release();
    }
  }

  setMinRelayerCount(minRelayerCount: number) {
    this.minRelayerCount = minRelayerCount;
  }

  setMaxRelayerCount(maxRelayerCount: number) {
    this.maxRelayerCount = maxRelayerCount;
  }

  setInactiveRelayerCountThreshold(threshold: number) {
    this.inactiveRelayerCountThreshold = threshold;
  }

  setPendingTransactionCountThreshold(threshold: number) {
    this.pendingTransactionCountThreshold = threshold;
  }
}
