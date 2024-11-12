import { Address } from "viem";
import { EVMRawTransactionType } from "../../../common/types";
import { IAccount } from "./IAccount";

export interface IEVMAccount extends IAccount {
  rpcUrl: string;
  address: Address;
  getPublicKey(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: EVMRawTransactionType): Promise<string>;
  sendTransaction(rawTransaction: EVMRawTransactionType): Promise<string>;
}
