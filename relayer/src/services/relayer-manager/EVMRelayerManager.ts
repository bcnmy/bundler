/* eslint-disable no-param-reassign */
import { Mutex } from 'async-mutex';
import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import hdkey from 'hdkey';
import { RawTransactionType } from 'network-sdk/dist/types';
import { logger } from '../../../../common/log-config';
import { config } from '../../../../common/service-manager';
import { stringify } from '../../utils/util';
import { EVMAccount } from '../account';
import { ITransactionService } from '../transaction-service/interface';
import { IRelayerManager } from './interface/IRelayerManager';
import { RelayerManagerType } from '../../../../common/types';

const log = logger(module);
const fundRelayerMutex = new Mutex();
const createRelayerMutex = new Mutex();

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

  transactionService: ITransactionService<EVMAccount>; // to fund relayers

  // TODO
  // Update default values to fetch from config
  minRelayerCount: number = 5; // minimum number of relayers to be created

  maxRelayerCount: number = 15; // maximum number of relayers to be created
  
  inactiveRelayerCountThreshold: number = 0.6;

  pendingTransactionCountThreshold: number = 15;

  newRelayerInstanceCount: number = 2;

  relayerMap?: Record<string, EVMAccount>;

  constructor(
    chainId: number,
    transactionService: ITransactionService<EVMAccount>,
  ) {
    this.chainId = chainId;
    this.transactionService = transactionService;
  }

  setMinRelayerCount = (minRelayerCount: number) => {
    this.minRelayerCount = minRelayerCount;
  };

  setMaxRelayerCount = (maxRelayerCount: number) => {
    this.maxRelayerCount = maxRelayerCount;
  };

  async createRelayers(numberOfRelayers: number): Promise<void> {
    log.info(`Waiting for lock to create relayers on ${this.chainId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.chainId}`);

    try {
      const promises = [];
      for (let relayerIndex = 1; relayerIndex <= numberOfRelayers; relayerIndex += 1) {
        const index = this.getRelayersCount() + relayerIndex;

        const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
        const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

        const { nodePathIndex } = config.relayerService;
        const nodePath = `${nodePathRoot + nodePathIndex}/`;
        const ethNodePath: any = ethRoot.derive(nodePath + this.id);
        const privateKey = ethNodePath._privateKey.toString('hex');
        const ethPubkey = privateToPublic(ethNodePath.privateKey);

        const ethAddr = publicToAddress(ethPubkey).toString('hex');
        const ethAddress = toChecksumAddress(`0x${ethAddr}`);
        const address = ethAddress.toLowerCase();
        const relayer = new EVMAccount(
          address,
          privateKey,
        );
        promises.push(relayer.create(this.messenger));
      }
      const relayers: EVMAccount[] = await Promise.all(promises);

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

  async fundRelayer(address: string) {
    const BICONOMY_OWNER_PRIVATE_KEY = config?.chains.ownerAccountDetails[this.chainId].privateKey;
    const BICONOMY_OWNER_ADDRESS = config?.chains.ownerAccountDetails[this.chainId].publicKey;

    const fundingRelayerAmount = config?.relayerManager[RelayerManagerType.AA].fundingRelayerAmount;
    const gasLimitMap = config?.relayerManager[0].gasLimitMap;



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
          .utils.parseEther(fundingRelayerAmount[this.chainId].toString()).toHexString(),
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

  async getRelayer(relayerAddress: string): Promise<EVMAccount> {
    
  }

  async getActiveRelayer(): Promise<EVMAccount> {
    
  }
}
