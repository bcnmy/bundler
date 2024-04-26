import { EVMRawTransactionType } from "../../../common/types";

export interface IEVMAccount {
  getPublicKey(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: EVMRawTransactionType): Promise<string>;
  sendTransaction(rawTransaction: EVMRawTransactionType): Promise<string>;
}
