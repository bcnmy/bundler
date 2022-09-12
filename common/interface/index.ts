import { Signer } from 'ethers';

interface IAccount {
  getPublicKey(): string
}

interface IEVMAccount extends IAccount {
  signer: Signer
}
