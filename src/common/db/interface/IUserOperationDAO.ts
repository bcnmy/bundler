import { IUserOperation } from "../mongo/interface";

export type InitialUserOperationDataType = {
  transactionId: string;
  dappAPIKey?: string;
  entryPoint: string;
  sender: string;
  initCode: string;
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
  paymasterAndData: string;
  creationTime: number;
  metaData?: object;
};

export type FinalUserOperationDataType = {
  transactionHash?: string;
  receipt: object;
  status: string;
  success: string;
  blockNumber: number;
  blockHash: string;
  actualGasCost: number;
  actualGasUsed: number;
  reason: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any;
};

export interface IUserOperationDAO {
  save(
    chainId: number,
    initialUserOperationData: InitialUserOperationDataType,
  ): Promise<void>;
  getUserOperationDataByUserOpHash(
    chainId: number,
    userOpHash: string,
  ): Promise<IUserOperation | null>;
  updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
    chainId: number,
    userOpHash: string,
    transactionId: string,
    initialUserOperationData: FinalUserOperationDataType,
  ): Promise<void>;
  getUserOpsByTransactionId(
    chainId: number,
    transactionId: string,
  ): Promise<IUserOperation[]>;
  getUserOperationsDataByApiKey(
    chainId: number,
    bundlerApiKey: string,
    startTime: number,
    endTime: number,
    limit: number,
    offSet: number,
  ): Promise<Array<IUserOperation>>;
  getUserOperationsCountByApiKey(
    chainId: number,
    bundlerApiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<number>;
}
