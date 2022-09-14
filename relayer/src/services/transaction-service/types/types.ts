export type TransactionResponseType = {
  chainId: number;
  transactionId: string;
  transactionHash: string;
  relayerAddress: string;
};

export type TransactionDataType = {
  to: string;
  value: string;
  data: string;
  gasLimit ?: number;
  // TODO
  // define speed as an enum in Network SDK
  speed ?: string;
  transactionId: string;
};

export type EVMTransactionResponseType = TransactionResponseType;
