interface IAccount {
  getPublicKey(): string
}

export interface IEVMAccount<RawTransactionType> extends IAccount {
  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: RawTransactionType): Promise<string>
}

// export interface ISolanaAccount extends IAccount {
//   signer: Solana.signer;

//   signMessage(message: string): Promise<string>;
//   signTransaction(rawTransaction: RawTransactionType): Promise<string>
// }
