import { Network } from 'network-sdk';

// Review all types
export type ITransactionData = {
  gasLimit?: string,
  gasLimitCalculateInSimulation: string,
  to: string,
  data: string,
  transactionId: string,
  value: string,
  chainId: number,
};

export type IRawTransaction = {
  gasPrice: string,
  gasLimit: string,
  to: string,
  value: string,
  data: string,
  chainId: number,
  nonce: string,
};

export type ExecuteParams = {
  rawTransaction: IRawTransaction,
  network: Network,
  retryCount: number,
  relayerAddress: string,
  relayerPrivateKey: string,
  transactionId: string
};

// https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
export type TransactionResponse = {
}