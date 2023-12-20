import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from './interface/IEVMAccount';

export class EVMAccount implements IEVMAccount {
  private account: PrivateKeyAccount;

  private publicKey: string;

  constructor(accountPublicKey: string, accountPrivateKey: string) {
    this.account = privateKeyToAccount(`0x${accountPrivateKey}`);
    this.publicKey = accountPublicKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  signMessage(message: string): Promise<string> {
    return this.account.signMessage({ message });
  }

  signTransaction(rawTransaction: EVMRawTransactionType): Promise<string> {
    return this.account.signTransaction(rawTransaction);
  }
}
