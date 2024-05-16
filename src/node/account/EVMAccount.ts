/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/return-await */
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, WalletClient, http } from "viem";
import { loadBalance } from "@ponder/utils";
import { IEVMAccount } from "./interface/IEVMAccount";
import { config } from "../../common/config";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../common/types/types";
import {
  isEVM1559RawTransaction,
  isEVMLegacyRawTransaction,
} from "../../common/types";
import { customJSONStringify } from "../../common/utils";

export class EVMAccount implements IEVMAccount {
  private account: PrivateKeyAccount;

  private publicKey: string;

  private walletClient: WalletClient;

  constructor(
    accountPublicKey: string,
    accountPrivateKey: string,
    chainId: number,
  ) {
    this.account = privateKeyToAccount(`0x${accountPrivateKey}`);
    this.walletClient = createWalletClient({
      transport: loadBalance(
        config.chains.providers[chainId].map((p) => http(p.url)),
      ),
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

  signTransaction(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ): Promise<string> {
    return this.account.signTransaction(rawTransaction as any);
  }

  async sendTransaction(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ): Promise<`0x${string}`> {
    if (isEVM1559RawTransaction(rawTransaction)) {
      return await this.walletClient.sendTransaction({
        ...rawTransaction,
        account: this.account,
        chain: null,
        type: "eip1559",
      });
    } 
    
    if (isEVMLegacyRawTransaction(rawTransaction)) {
      return await this.walletClient.sendTransaction({
        ...rawTransaction,
        account: this.account,
        chain: null,
        type: "legacy",
      });
    }

    throw new Error(`rawTransaction: ${customJSONStringify(rawTransaction)} is neither a 1559 or legacy transaction`);
  }
}
