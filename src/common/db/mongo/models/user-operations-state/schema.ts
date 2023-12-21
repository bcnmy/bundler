import mongoose from 'mongoose';
import { IUserOperationState } from '../../interface';

const { Schema } = mongoose;

export const UserOperationStateSchema = new Schema<IUserOperationState>({
  userOpHash: {
    type: String,
  },
  transactionId: {
    type: String,
  },
  transactionHash: {
    type: String,
  },
  state: {
    type: String,
  },
  message: {
    type: String,
  },
});
