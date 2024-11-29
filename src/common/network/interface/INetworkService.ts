/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicClient, Transaction, TransactionReceipt } from "viem";
import {
  Type0TransactionGasPriceType,
  Type2TransactionGasPriceType,
} from "../types";
import { IEVMAccount } from "../../../relayer/account";
import { FlashbotsClient } from "../FlashbotsClient";

export interface INetworkService<AccountType, RawTransactionType> {
  chainId: number;
  rpcUrls: string[];
  rpcUrl: string;
  mevProtectedRpcUrl?: string;
  provider: PublicClient;
  supportsBlockNative: boolean;

  flashbots?: FlashbotsClient;
  supportsFlashbots: boolean;

  getBlockNativeFeesPerGas(confidenceLevel?: number): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }>;
  sendRpcCall(method: string, params: Array<any>): Promise<any>;
  getBaseFeePerGas(): Promise<bigint>;
  getLegacyGasPrice(): Promise<Type0TransactionGasPriceType>;
  getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType>;
  getBalance(address: string): Promise<bigint>;
  getNonce(account: IEVMAccount, pendingNonce?: boolean): Promise<number>;
  getNetworkNonce(account: IEVMAccount, pending?: boolean): Promise<number>;
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
  getLatestBlockNumber(): Promise<bigint>;
  getTransaction(transactionHash: string): Promise<Transaction | null>;
  ethCall(params: any): Promise<any>;
}
