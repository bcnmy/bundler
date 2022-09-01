import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import hdkey from 'hdkey';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';

const log = logger(module);

const relayersMasterSeed = config.relayerService.masterSeed;
const nodePathRoot = "m/44'/60'/0'/";

export class Relayer {
  /** @property index value of relayer created by relayer manager */
  id: number;

  /** @property public address of the relayer to relay the transaction from */
  address: string = '';

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
  networkId: number;

  constructor(
    relayerId: number,
    networkId: number,
  ) {
    this.id = relayerId;
    this.active = true;
    this.networkId = networkId;
    this.pendingTransactionCount = 0;
  }

  /**
   * Creates relayer and sets the balance, nonce property via rpc call.
   * It also sets up a channel for relaying the transaction.
   */
  async create(managerMessenger: RelayerManagerMessenger) {
    if (!relayersMasterSeed) throw new Error('provide relayers master seed');

    const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
    const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

    const { nodePathIndex } = config.relayerService;

    const nodePath = `${nodePathRoot + nodePathIndex}/`;
    const ethNodePath: any = ethRoot.derive(nodePath + this.id);
    const privateKey = ethNodePath._privateKey.toString('hex');
    const ethPubkey = privateToPublic(ethNodePath.privateKey);

    const ethAddr = publicToAddress(ethPubkey).toString('hex');
    const ethAddress = toChecksumAddress(`0x${ethAddr}`);
    this.address = ethAddress.toLowerCase();

    this.publicKey = ethPubkey.toString();
    this.privateKey = privateKey.toLowerCase();

    await this.setBalance();
    await this.setNonce();
    await this.setPendingCount();

    return this;
  }

  getStatus() {
    return this.active;
  }

  setStatus(status: boolean) {
    this.active = status;
  }

  async setBalance() {
    // TODO: Get network instance from network manager
    this.balance = (await this.network.getBalance(this.address));
  }

  async setNonce() {
    // if (localUpdate && !this.nonce) this.nonce += 1;
    this.nonce = await this.network.getNonce(this.address, true);
  }
}
