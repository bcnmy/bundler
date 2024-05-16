import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types";
import { IAccount } from "./IAccount";

export interface IEVMAccount extends IAccount {
  getPublicKey(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ): Promise<string>;
  sendTransaction(
    rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction,
  ): Promise<`0x${string}`>;
}
