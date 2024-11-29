import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  WalletClient,
  http,
  Hex,
  Address,
  formatEther,
} from "viem";
import { EVMRawTransactionType } from "../../common/types";
import { IEVMAccount } from "./interface/IEVMAccount";
import { logger } from "../../common/logger";
import { hideRpcUrlApiKey } from "../../common/network/utils";
import { INetworkService } from "../../common/network";
import { INonceManager } from "../nonce-manager";

export class EVMAccount implements IEVMAccount {
  public rpcUrl: string;

  public address: Address;

  public chainId: number;

  private account: PrivateKeyAccount;

  private publicKey: string;

  private walletClient: WalletClient;

  private nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;

  private networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    accountPublicKey: string,
    accountPrivateKey: string,
    rpcUrl: string,
    chainId: number,
    nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.rpcUrl = rpcUrl;
    this.account = privateKeyToAccount(`0x${accountPrivateKey}`);
    this.walletClient = createWalletClient({
      transport: http(this.rpcUrl),
      account: privateKeyToAccount(`0x${accountPrivateKey}`),
    });
    this.publicKey = accountPublicKey;
    this.address = this.account.address;
    this.chainId = chainId;
    this.nonceManager = nonceManager;
    this.networkService = networkService;
  }

  public async getNonces(): Promise<Nonces> {
    const promises = [
      this.nonceManager.getNonce(this),
      this.networkService.getNetworkNonce(this),
    ];

    if (this.networkService.mevProtectedRpcUrl) {
      promises.push(this.networkService.getNonce(this));
    }

    const results = await Promise.all(promises);

    const chain =
      typeof results[1] === "string" ? parseInt(results[1], 16) : results[1];

    return {
      nonceManager: results[0],
      chain,
      flashbots: results.length > 2 ? results[2] : undefined,
    };
  }

  public async getInfo(): Promise<EVMAccountInfo> {
    const [balanceWei, nonces] = await Promise.all([
      this.networkService.getBalance(this.address),
      this.getNonces(),
    ]);

    return {
      chainId: this.chainId,
      address: this.address,
      rpcUrl: hideRpcUrlApiKey(this.rpcUrl),
      balanceEth: formatEther(balanceWei),
      nonces,
    };
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  signMessage(message: string): Promise<string> {
    return this.account.signMessage({ message });
  }

  signTransaction(rawTransaction: EVMRawTransactionType): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.account.signTransaction(rawTransaction as any);
  }

  async sendTransaction(
    rawTransaction: EVMRawTransactionType,
  ): Promise<string> {
    const sendTransactionParameters =
      this.createSendTransactionParams(rawTransaction);

    const txHash = await this.walletClient.sendTransaction(
      sendTransactionParameters,
    );

    logger.info(
      { txHash, rpcUrl: hideRpcUrlApiKey(this.rpcUrl) },
      `Transaction sent.`,
    );

    return txHash;
  }

  private createSendTransactionParams(
    rawTransaction: EVMRawTransactionType,
  ): SendEip1559TransactionParameters | SendLegacyTransactionParameters {
    const baseParams: BaseSendTransactionParameters = {
      account: this.account,
      to: rawTransaction.to as Hex,
      value: BigInt(rawTransaction.value),
      data: rawTransaction.data as Hex,
      nonce: Number(rawTransaction.nonce),
      chain: null,
      gas: BigInt(rawTransaction.gasLimit),
    };

    if (rawTransaction.type === "eip1559") {
      return {
        ...baseParams,
        type: "eip1559",
        maxFeePerGas: BigInt(rawTransaction.maxFeePerGas || 0),
        maxPriorityFeePerGas: BigInt(rawTransaction.maxPriorityFeePerGas || 0),
      };
    } else {
      return {
        ...baseParams,
        type: "legacy",
        gas: BigInt(rawTransaction.gasLimit),
        gasPrice: BigInt(rawTransaction.gasPrice ? rawTransaction.gasPrice : 0),
      };
    }
  }
}

interface Nonces {
  nonceManager: number;
  chain: number;
  flashbots?: number;
}

export interface EVMAccountInfo {
  chainId: number;
  address: string;
  rpcUrl: string;
  balanceEth: string; // in ether
  nonces: Nonces;
}

interface BaseSendTransactionParameters {
  account: PrivateKeyAccount;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: number;
  chain: null;
  gas: bigint;
}

interface SendEip1559TransactionParameters
  extends BaseSendTransactionParameters {
  type: "eip1559";
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

interface SendLegacyTransactionParameters
  extends BaseSendTransactionParameters {
  type: "legacy";
  gasPrice: bigint;
}
