import { Transaction } from "viem";
import { EVMRawTransactionType, TransactionType } from "../../types";

export type TransactionMessageType = Transaction;

export type RetryTransactionQueueData = {
  relayerAddress: string;
  transactionType: TransactionType;
  transactionHash?: string;
  transactionId: string;
  rawTransaction: EVMRawTransactionType;
  walletAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metaData: any;
  relayerManagerName: string;
};
