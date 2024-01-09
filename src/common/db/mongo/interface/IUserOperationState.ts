import { UserOperationStateEnum } from "../../../types";

export interface IUserOperationState {
  transactionId: string;
  transactionHash: string;
  userOpHash: string;
  code: number;
  state: UserOperationStateEnum;
  message: string;
}
