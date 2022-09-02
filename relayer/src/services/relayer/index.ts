import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import hdkey from 'hdkey';
import { Network } from 'network-sdk';
import { config } from '../../../config';
import { IRelayer } from './interface';

const relayersMasterSeed = config.relayerService.masterSeed;
const nodePathRoot = "m/44'/60'/0'/";

export class Relayer implements IRelayer {
  /** @property index value of relayer created by relayer manager */
  id: number;

  /** @property public key of the relayer which can be used while sending the transaction */
  private publicKey: string = '';

  /** @property private key of the relayer to be used while sending the transaction */
  private privateKey: string = '';

  /** @property status of the relayer */
  active: boolean = false;

  /** @property number of transactions sent by the relayer */
  nonce: number = 0;

  /** @property balance of the relayer */
  balance: ethers.BigNumber = ethers.utils.parseEther('0');

  /** @property minimum balance required in the relayer */
  chainId: number;

  /** @property maintains the count of pending transaction */
  pendingTransactionCount: number = 0;

  network: Network;

  // TODO
  // Make constructor accept an object
  constructor(
    relayerId: number,
    chainId: number,
    network: Network,
  ) {
    this.id = relayerId;
    this.active = true;
    this.chainId = chainId;
    this.network = network;
  }

  /**
   * Creates relayer and sets the balance, nonce property via rpc call.
   * It also sets up a channel for relaying the transaction.
   */
  async create(): Promise<IRelayer> {
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

    this.publicKey = ethPubkey.toString();
    this.privateKey = privateKey.toLowerCase();

    await this.setBalance();
    await this.setNonce();
    this.pendingTransactionCount = 0;

    return this;
  }

  setActiveStatus(status: boolean): void {
    this.active = status;
  }

  async setBalance(): Promise<void> {
    this.balance = (await this.network.getBalance(this.publicKey));
  }

  async setNonce(): Promise<void> {
    this.nonce = await this.network.getNonce(this.publicKey, true);
  }

  async setPendingTransactionCount(): Promise<void> {
    const latestCount = await this.network.getNonce(this.publicKey, false);
    const pendingCount = await this.network.getNonce(this.publicKey, true);
    const diff = pendingCount - latestCount;
    this.pendingTransactionCount = diff > 0 ? diff : 0;
  }

  getPendingTransactionCount(): number {
    return this.pendingTransactionCount;
  }
}
