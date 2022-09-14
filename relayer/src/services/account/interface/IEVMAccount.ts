import { IAccount } from './IAccount';

export interface IEVMAccount<T> extends IAccount {
  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: T): Promise<string>
}
