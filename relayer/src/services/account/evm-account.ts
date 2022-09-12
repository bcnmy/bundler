import { ethers } from 'ethers';
import { IEVMRawTransaction } from '../../common';
import { IEVMAccount } from './interface';

export class EVMAccount implements IEVMAccount<IEVMRawTransaction> {
  signer: ethers.Signer;
  
  publicKey: string;

  constructor(accountPublicKey: string, accountPrivateKey: string) {
    this.signer = new ethers.Wallet(accountPrivateKey);
    this.publicKey = accountPublicKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  signMessage(message: string): Promise<string> {
    return this.signer.signMessage(message);
  }

  signTransaction(rawTransaction: IEVMRawTransaction): Promise<string> {
    return this.signer.signTransaction(rawTransaction);
  }
}
