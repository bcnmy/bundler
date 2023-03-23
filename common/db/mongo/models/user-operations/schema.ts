import mongoose from 'mongoose';
import { IUserOperation } from '../../interface/IUserOperation';

const { Schema } = mongoose;

export const UserOperationSchema = new Schema<IUserOperation>({
  transactionId: {
    type: String,
    required: true,
  },
  transactionHash: {
    type: String,
  },
  chainId: { type: Number },
  sender: {
    type: String,
  },
  nonce: {
    type: Number,
  },
  initCode: {
    type: String,
  },
  callData: {
    type: String,
  },
  callGasLimit: {
    type: Number,
  },
  verificationGasLimit: {
    type: Number,
  },
  preVerificationGas: {
    type: Number,
  },
  maxFeePerGas: {
    type: Number,
  },
  maxPriorityFeePerGas: {
    type: Number,
  },
  paymasterAndData: {
    type: String,
  },
  signature: {
    type: String,
  },
  userOpHash: {
    type: String,
  },
  receipt: {
    type: Object,
  },
  creationTime: {
    type: Number,
  },
});
