import {
  EstimateGasParameters,
  PublicClient,
  Transaction,
  TransactionReceipt,
} from "viem";

export interface INetworkService<AccountType, RawTransactionType> {
  chainId: number;
  publicClient: PublicClient;

  getBaseFeePerGas(): Promise<bigint>;
  getLegacyGasPrice(): Promise<bigint>;
  getEIP1559FeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }>;
  getBalance(address: string): Promise<bigint>;
  getNonce(address: string, pendingNonce?: boolean): Promise<number>;
  estimateGas(params: EstimateGasParameters): Promise<bigint>;
  sendTransaction(
    rawTransactionData: RawTransactionType,
    account: AccountType,
  ): Promise<`0x${string}`>;
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
}
