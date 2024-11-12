/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicClient, Transaction, TransactionReceipt } from "viem";
import {
  Type0TransactionGasPriceType,
  Type2TransactionGasPriceType,
} from "../types";
import { IEVMAccount } from "../../../relayer/account";

export interface INetworkService<AccountType, RawTransactionType> {
  chainId: number;
  rpcUrls: string[];
  rpcUrl: string;
  mevProtectedRpcUrl?: string;
  provider: PublicClient;

  sendRpcCall(method: string, params: Array<any>): Promise<any>;
  getBaseFeePerGas(): Promise<bigint>;
  getLegacyGasPrice(): Promise<Type0TransactionGasPriceType>;
  getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType>;
  getBalance(address: string): Promise<bigint>;
  getNonce(account: IEVMAccount, pendingNonce?: boolean): Promise<number>;
  getFlashbotsNonce(account: IEVMAccount): Promise<number>;
  estimateGas(params: any): Promise<any>;
  sendTransaction(
    rawTransactionData: RawTransactionType,
    account: AccountType,
  ): Promise<string | Error>;
  getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt | null>;
  waitForTransaction(
    transactionHash: string,
    transactionId: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt>;
  getLatesBlockNumber(): Promise<bigint>;
  getTransaction(transactionHash: string): Promise<Transaction | null>;
  runAlchemySimulation(params: any): Promise<any>;
  ethCall(params: any): Promise<any>;
}
