import { IUserOperationV07 } from "../mongo/interface";

export type InitialUserOperationV07DataType = {
  transactionId: string;
  dappAPIKey?: string;
  entryPoint: string;
  sender: string;
  nonce: number;
  callData: string;
  callGasLimit: number;
  verificationGasLimit: number;
  preVerificationGas: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  signature: string;
  userOpHash: string;
  chainId: number;
  status: string;
  paymaster: string;
  paymasterVerificationGasLimit: number;
  paymasterPostOpGasLimit: number;
  factory: string;
  factoryData: string;
  paymasterData: string;
  creationTime: number;
  metaData?: object;
};

export type FinalUserOperationV07DataType = {
  transactionHash?: string;
  receipt: object;
  status: string;
  success: string;
  blockNumber: number;
  blockHash: string;
  actualGasCost: number;
  actualGasUsed: number;
  reason: string;
  logs: any;
};

export interface IUserOperationV07DAO {
  save(
    chainId: number,
    initialUserOperationData: InitialUserOperationV07DataType,
  ): Promise<void>;
  getUserOperationDataByUserOpHash(
    chainId: number,
    userOpHash: string,
  ): Promise<IUserOperationV07 | null>;
  updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
    chainId: number,
    userOpHash: string,
    transactionId: string,
    initialUserOperationData: FinalUserOperationV07DataType,
  ): Promise<void>;
  getUserOpsByTransactionId(
    chainId: number,
    transactionId: string,
  ): Promise<IUserOperationV07[]>;
  getUserOperationsDataByApiKey(
    chainId: number,
    bundlerApiKey: string,
    startTime: number,
    endTime: number,
    limit: number,
    offSet: number,
  ): Promise<Array<IUserOperationV07>>;
  getUserOperationsCountByApiKey(
    chainId: number,
    bundlerApiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<number>;
}
