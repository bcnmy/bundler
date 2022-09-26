/* eslint-disable no-param-reassign */
import { Mutex } from 'async-mutex';
import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import hdkey from 'hdkey';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { AATransactionMessageType } from '../../../../common/types';
import { config } from '../../../../config';
import { stringify } from '../../utils/util';
import { EVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { ITransactionService } from '../transaction-service/interface/ITransactionService';
import { IRelayerManager } from './interface/IRelayerManager';
import { SortRelayerByLeastPendingCount } from './strategy/SortRelayerByLeastPendingCount';
import { StrategyManager } from './strategy/StrategyManager';
import { EVMRelayerMetaDataType } from './types';

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
  chainId: number;

  transactionService: ITransactionService<EVMAccount>;

  minRelayerCount: number = 5;

  maxRelayerCount: number = 15;

  inactiveRelayerCountThreshold: number = 0.6;

  pendingTransactionCountThreshold: number = 15;

  newRelayerInstanceCount: number = 10;

  public activeRelayerData: Array<EVMRelayerMetaDataType> = [];

  public relayerMap: Record<string, EVMAccount> = {};

  nonceManagerService: INonceManager;

  networkService: INetworkService<EVMAccount, AATransactionMessageType>;

  constructor(
    chainId: number,
    networkService: INetworkService<EVMAccount, AATransactionMessageType>,
    transactionService: ITransactionService<EVMAccount>,
    nonceManagerService: INonceManager,
  ) {
    this.chainId = chainId;
    this.networkService = networkService;
    this.transactionService = transactionService;
    this.nonceManagerService = nonceManagerService;
  }

  getActiveRelayer(): void {
    const strategy = new StrategyManager(new SortRelayerByLeastPendingCount());
    strategy.performAlgorithm(this.activeRelayerData);
  }

  getRelayersCount() {
    if (this.maxRelayerCount < 10) {
      return this.maxRelayerCount;
    }
    return 10;
  }

  async createRelayers(numberOfRelayers: number): Promise<void> {
    log.info(`Waiting for lock to create relayers on ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.chainId}`);
    const relayersMasterSeed = config.chains.ownerAccountDetails[0].privateKey;
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
        this.activeRelayerData.push({
          address: relayer.getPublicKey(),
          pendingCount: 0,
          nonce: await this.nonceManagerService.getNonce(relayerAddress),
          balance: (await this.networkService.getBalance(relayerAddress)).toNumber(),
        });
      });
    } catch (error) {
      console.log(error);
      log.error(`failed to create relayers ${stringify(error)} on network id ${this.chainId}`);
    }

    release();
    log.info(`Lock released after creating relayers on ${this.chainId}`);
  }

  async fundRelayers(ownerAccount: EVMAccount, address: string[]): Promise<boolean> {
    console.log(this.pendingTransactionCountThreshold, ownerAccount, address);
    return true;
  }

  getRelayer(relayerAddress: string): EVMAccount | RelayerMetaDataType {
    return this.relayerMap[relayerAddress];
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
