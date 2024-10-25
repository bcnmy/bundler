import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, WalletClient, http } from "viem";
import { EVMRawTransactionType } from "../../common/types";
import { IEVMAccount } from "./interface/IEVMAccount";

export class EVMAccount implements IEVMAccount {
  private account: PrivateKeyAccount;

  private publicKey: string;

  private walletClient: WalletClient;

  constructor(
    accountPublicKey: string,
    accountPrivateKey: string,
    rpcUrl: string,
  ) {
    this.account = privateKeyToAccount(`0x${accountPrivateKey}`);
    this.walletClient = createWalletClient({
      transport: http(rpcUrl),
      account: privateKeyToAccount(`0x${accountPrivateKey}`),
    });
    this.publicKey = accountPublicKey;
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
    let sendTransactionParameters;
    if (rawTransaction.type === "eip1559") {
      const transactionType = "eip1559";
      sendTransactionParameters = {
        account: this.account,
        to: rawTransaction.to as `0x${string}`,
        value: BigInt(rawTransaction.value),
        data: rawTransaction.data as `0x${string}`,
        nonce: Number(rawTransaction.nonce),
        chain: null,
        type: transactionType as unknown as "eip1559",
        gas: BigInt(rawTransaction.gasLimit),
        maxFeePerGas: BigInt(
          rawTransaction.maxFeePerGas ? rawTransaction.maxFeePerGas : 0,
        ),
        maxPriorityFeePerGas: BigInt(
          rawTransaction.maxPriorityFeePerGas
            ? rawTransaction.maxPriorityFeePerGas
            : 0,
        ),
      };
    } else {
      const transactionType = "legacy";
      sendTransactionParameters = {
        account: this.account,
        to: rawTransaction.to as `0x${string}`,
        value: BigInt(rawTransaction.value),
        data: rawTransaction.data as `0x${string}`,
        nonce: Number(rawTransaction.nonce),
        chain: null,
        type: transactionType as unknown as "legacy",
        gas: BigInt(rawTransaction.gasLimit),
        gasPrice: BigInt(rawTransaction.gasPrice ? rawTransaction.gasPrice : 0),
      };
    }
    return await this.walletClient.sendTransaction(sendTransactionParameters);
  }
}
