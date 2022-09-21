export type FeeOptionResponseParams = {
  tokenGasPrice: number;
  symbol: string;
  address: string;
  decimal: number;
  logoUrl: string;
  offset: number;
  feeTokenTransferGas: number;
  refundReceiver?: string;
};
