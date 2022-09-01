import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import hdkey from 'hdkey';
import { Network } from 'network-sdk';
import { hostname } from 'os';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { TransactionStatus } from '../../common/types';
import { DaoUtils } from '../../dao-utils';
import {
  getGasPriceKey, getTransactionDataKey, getTransactionKey,
} from '../../utils/cache-utils';
import { getNativeTokenPriceInUSD } from '../../utils/native-token-price';
import { stringify } from '../../utils/util';
import { Transaction } from '../transaction';

const log = logger(module);

const relayersMasterSeed = config.relayerService.masterSeed;
const nodePathRoot = "m/44'/60'/0'/";

export class Relayer {
  /** @property index value of relayer created by relayer manager */
  id: number;

  /** @property public key of the relayer which can be used while sending the transaction */
  private publicKey: string = '';

  /** @property private key of the relayer to be used while sending the transaction */
  private privateKey: string = '';

  /** @property status of the relayer */
  private active: boolean = false;

  /** @property number of transactions sent by the relayer */
  nonce: number = 0;

  /** @property balance of the relayer */
  balance: ethers.BigNumber = ethers.utils.parseEther('0');

  /** @property minimum balance required in the relayer */
  // TODO
  // Get threshold from config and would vary from type of relayer
  private balanceThreshold: ethers.BigNumber = ethers.utils.parseEther('0.197');

  /** @property retry count of a particular transaction id */
  retryCount: any;

  /** @property minimum balance required in the relayer */
  networkId: number;

  /** @property maintains the count of pending transaction */
  pendingTransactionCount: number;

  pendingTransactionCountThreshold: number = 15;

  onRelayerActivate: () => void;

  onRelayerDeactivate: () => void;

  onRelayerRequestingFunds: (address: string) => void;

  queue: any;

  channel: any;

  consumerTag: string = '';

  rabbitmqConnection: any;


  constructor(
    relayerId: number,
    network: Network,
    networkId: number,
    connection: any, // rabbitmq connection
    onRelayerActivate: () => void,
    onRelayerDeactivate: () => void,
    onRelayerRequestingFunds: (address: string) => void,
  ) {
    this.id = relayerId;
    this.active = true;
    this.network = network;
    this.networkId = networkId;
    this.rabbitmqConnection = connection;
    this.pendingTransactionCount = 0;
    this.onRelayerActivate = onRelayerActivate;
    this.onRelayerDeactivate = onRelayerDeactivate;
    this.onRelayerRequestingFunds = onRelayerRequestingFunds;
  }

  /**
   * Creates relayer and sets the balance, nonce property via rpc call.
   * It also sets up a channel for relaying the transaction.
   */
  async create(managerMessenger: RelayerManagerMessenger) {
    if (!relayersMasterSeed) throw new Error('Provide Relayers Master Seed');

    const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
    const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

    const { nodePathIndex } = config.relayerService;

    const nodePath = `${nodePathRoot + nodePathIndex}/`;
    const ethNodePath: any = ethRoot.derive(nodePath + this.id);
    const privateKey = ethNodePath._privateKey.toString('hex');
    const ethPubkey = privateToPublic(ethNodePath.privateKey);

    const ethAddr = publicToAddress(ethPubkey).toString('hex');
    const ethAddress = toChecksumAddress(`0x${ethAddr}`);
    this.publicKey = ethAddress.toLowerCase();
    this.messenger = managerMessenger.getRelayerMessenger(this.publicKey);

    this.publicKey = ethPubkey.toString();
    this.privateKey = privateKey.toLowerCase();

    await this.setBalance();
    await this.setNonce();
    await this.setPendingCount();

    return this;
  }

  activeStatus() {
    return this.active;
  }

  setStatus(status: boolean) {
    this.active = status;
  }

  async setBalance() {
    this.balance = (await this.network.getBalance(this.address));
  }

  async setNonce() {
    // if (localUpdate && !this.nonce) this.nonce += 1;
    this.nonce = await this.network.getNonce(this.address, true);
  }
}
