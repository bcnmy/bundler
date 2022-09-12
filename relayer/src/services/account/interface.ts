import { ethers } from 'ethers';

interface IAccount {
  getPublicKey(): string
}

export interface IEVMAccount<RawTransactionType> extends IAccount {
  signer: ethers.Signer;

  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: RawTransactionType): Promise<string>
}

// export interface ISolanaAccount extends IAccount {
//   signer: Solana.signer;

//   signMessage(message: string): Promise<string>;
//   signTransaction(rawTransaction: RawTransactionType): Promise<string>
// }