export type Type2TransactionGasPriceType = {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint
};

export type Type0TransactionGasPriceType = bigint;

export type ContractEventFilterType = {
  address: string,
  topics: Array<string>
};
