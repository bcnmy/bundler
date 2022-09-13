/* eslint-disable no-param-reassign */
import { Network } from 'network-sdk';
import { RawTransactionType } from 'network-sdk/dist/types';
import { Mutex } from 'async-mutex';
import { ethers } from 'ethers';
import { config, configChangeListeners } from '../../../config';
import { logger } from '../../../../common/log-config';
import { stringify } from '../../utils/util';
import { Relayer } from '../relayer';
import { IRelayer } from '../relayer/interface';
import { IRelayerManager } from './interface';
import { EVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface';

const log = logger(module);
const fundRelayerMutex = new Mutex();
const createRelayerMutex = new Mutex();

const { gasLimit: gasLimitMap, relayerFundingAmount } = config.relayerService;
const { BICONOMY_OWNER_ADDRESS = '', BICONOMY_OWNER_PRIVATE_KEY = '' } = process.env;

enum RelayersStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

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
  chainId: number;

  transactionService: ITransactionService<EVMAccount>;

  // TODO
  // Update default values to fetch from config
  minRelayerCount: number = 5;

  maxRelayerCount: number = 15;

  inactiveRelayerCountThreshold: number = 0.6;

  pendingTransactionCountThreshold: number = 15;

  newRelayerInstanceCount: number = 10;

  relayerMap?: Record<string, EVMAccount>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<EVMAccount>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;

    configChangeListeners.relayerManagerService.push(this.onConfigChange.bind(this));
  }

  fundRelayers(relayer: EVMAccount): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  getRelayer(relayerAddress: string): Promise<EVMAccount> {
    throw new Error('Method not implemented.');
  }

  getActiveRelayer(): Promise<EVMAccount> {
    throw new Error('Method not implemented.');
  }

  setMinRelayerCount(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setMaxRelayerCount(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setInactiveRelayerCountThreshold(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  setPendingTransactionCountThreshold(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async createRelayers(numberOfRelayers: number): Promise<void> {
    log.info(`Waiting for lock to create relayers on ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.chainId}`);

    try {
      if (!this.mainAccountNonce) {
        this.mainAccountNonce = await this.fetchMainAccountNonceFromNetwork();
      }

      const promises = [];
      for (let relayerIndex = 1; relayerIndex <= numberOfRelayers; relayerIndex += 1) {
        const index = this.getRelayersCount() + relayerIndex;
        const relayer = new Relayer(
          index,
          this.network,
          this.chainId,
        );
        promises.push(relayer.create(this.messenger));
      }
      const relayers: Relayer[] = await Promise.all(promises);

      log.info(`Relayers created on network id ${this.chainId}`);
      relayers.map(async (relayer) => {
        const relayerAddress = relayer.address.toLowerCase();
        this.relayersMap[relayerAddress] = relayer;
        await this.fundRelayer(relayerAddress);

        await this.relayersMap[relayerAddress].createChannel();
      });
    } catch (error) {
      console.log(error);
      log.error(`failed to create relayers ${stringify(error)} on network id ${this.chainId}`);
    }

    release();
    log.info(`Lock released after creating relayers on ${this.chainId}`);
  }

  async fetchMainAccountNonceFromNetwork(): Promise<number> {
    return this.network;
  }

  async fetchActiveRelayer(): Promise<IRelayer> {

  }

  static updateRelayerBalance(relayer: IRelayer): number {

  }

  updateRelayerMap(relayer: IRelayer) {
    this.relayersMap[relayer.id] = relayer;
  }

  updateRetryCountMap(relayer: IRelayer) {
    this.retryCountMap[relayer.id] += 1;
  }

  updatePendingTransactionCountMap(relayer: IRelayer, increment: number) {
    this.pendingTransactionCountMap[relayer.id] += increment;
  }

  incrementRelayerPendingCount(relayer: IRelayer): IRelayer {
    relayer.pendingTransactionCount += 1;
    this.updatePendingTransactionCountMap(relayer, 1);
    return relayer;
  }

  decrementRelayerPendingCount(relayer: IRelayer): IRelayer {
    relayer.pendingTransactionCount -= 1;
    this.updatePendingTransactionCountMap(relayer, -1);
    return relayer;
  }

  async fundRelayer(address: string) {
    try {
      // check funding threshold
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(`Has sufficient funds in relayer ${address} on network id ${this.chainId}`);
        return;
      }
      const release = await fundRelayerMutex.acquire();

      log.info(`Funding relayer ${address} on network id ${this.chainId}`);

      let gasLimitIndex = 0;
      // different gas limit for arbitrum
      if ([42161, 421611].includes(this.chainId)) gasLimitIndex = 1;

      const gasLimit = gasLimitMap[gasLimitIndex].toString();
      // fetch gas price
      const { gasPrice } = await this.network.getGasPrice();

      const mainAccountNonce = await this.getMainAccountNonce();

      const rawTx: RawTransactionType = {
        from: BICONOMY_OWNER_ADDRESS,
        gasPrice: ethers.BigNumber.from(
          gasPrice.toString(),
        ).toHexString(),
        gasLimit: ethers.BigNumber.from(
          gasLimit.toString(),
        ).toHexString(),
        to: address,
        value: ethers
          .utils.parseEther(relayerFundingAmount[this.chainId].toString()).toHexString(),
        nonce: ethers.BigNumber.from(
          mainAccountNonce.toString(),
        ).toHexString(),
        chainId: this.chainId,
      };
      log.info(`Funding relayer ${address} on network id ${this.chainId} with raw tx ${stringify(rawTx)}`);
      const transaction = new Transaction({
        rawTransaction: rawTx,
        fromAddress: BICONOMY_OWNER_ADDRESS,
        privateKey: BICONOMY_OWNER_PRIVATE_KEY,
        chainId: this.chainId,
      }, this.network);
      const response: any = await transaction.execute();
      if (response.nonce) {
        this.mainAccountNonce = response.nonce + 1;
      }
      release();
      const { hash, error } = response;
      if (hash) {
        log.info(`Hash from funding relayer ${address} is ${hash} on network id ${this.chainId}`);
        this.listenForTransactionStatus(hash);
      } else if (error) {
        log.error(`Unable to fund relayer ${address} due to ${error} on network id ${this.chainId}`);
      }
    } catch (error) {
      log.error(`Error in fundRelayer ${stringify(error)}`);
    }
  }

  async onConfigChange(uconfig: any) {
    this.minimumRelayerCount = uconfig.relayerManagerService.minimumRelayerCount;
    const extraRelayersToSpinUp = this.minimumRelayerCount - this.getRelayersCount();
    if (extraRelayersToSpinUp > 0) {
      this.createRelayers(extraRelayersToSpinUp);
    }
  }

  async getMainAccountNonceFromNetwork() {
    const nonce = await this.network.getNonce(BICONOMY_OWNER_ADDRESS, true);
    return nonce;
  }

  getMainAccountNonce() {
    return this.mainAccountNonce;
  }
}
