import { ethers } from 'ethers';

export type TransactionListenerMessageType = {
  // TODO
  // Define the struct to send
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse: ethers.providers.TransactionResponse,
  transactionId: string,
  relayerAddress: string,
  userAddress?: string
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;
