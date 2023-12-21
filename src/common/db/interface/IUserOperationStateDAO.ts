import { UserOperationStateEnum } from '../../types';
import { IUserOperationState } from '../mongo';

export type InitialUserOperationStateDataType = {
  userOpHash: string
  transactionId: string;
  state: UserOperationStateEnum
};

export type UpdateUserOperationStateDataType = {
  transactionId: string;
  transactionHash?: string;
  state: UserOperationStateEnum;
  message?: string;
};

export interface IUserOperationStateDAO {
  save(chainId: number, data: InitialUserOperationStateDataType): Promise<void>;
  updateState(chainId: number, data: UpdateUserOperationStateDataType): Promise<void>;
  get(chainId: number, userOpHash: string): Promise<IUserOperationState | null>
}
