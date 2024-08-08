export interface IUserOperationV07 {
  transactionId: string;
  transactionHash: string;
  entryPoint: string;
  sender: string;
  nonce: number;
  factory: string;
  factoryData: string,
  callData: string;
  callGasLimit: number;
  verificationGasLimit: number;
  preVerificationGas: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  signature: string;
  userOpHash: string;
  receipt: object;
  chainId: number;
  status: string;
  success: string;
  blockNumber: number;
  blockHash: string;
  paymaster: string;
  actualGasCost: number;
  actualGasUsed: number;
  reason: string;
  logs: object;
  creationTime: number;
  metaData: object;
  apiKey: string;
}
