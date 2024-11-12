import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, WalletClient, http, Hex, Address } from "viem";
import { EVMRawTransactionType } from "../../common/types";
import { IEVMAccount } from "./interface/IEVMAccount";
import { logger } from "../../common/logger";
import { hideRpcUrlApiKey } from "../../common/network/utils";

export class EVMAccount implements IEVMAccount {
  public rpcUrl: string;

  public address: Address;

  private account: PrivateKeyAccount;

  private publicKey: string;

  private walletClient: WalletClient;

  constructor(
    accountPublicKey: string,
    accountPrivateKey: string,
    rpcUrl: string,
  ) {
    this.rpcUrl = rpcUrl;
    this.account = privateKeyToAccount(`0x${accountPrivateKey}`);
    this.walletClient = createWalletClient({
      transport: http(this.rpcUrl),
      account: privateKeyToAccount(`0x${accountPrivateKey}`),
    });
    this.publicKey = accountPublicKey;
    this.address = this.account.address;
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
