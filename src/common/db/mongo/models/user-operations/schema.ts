import mongoose from "mongoose";
import { IUserOperation } from "../../interface/IUserOperation";

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
  status: {
    type: String,
  },
  success: {
    type: String,
  },
  entryPoint: {
    type: String,
  },
  blockNumber: {
    type: Number,
  },
  blockHash: {
    type: String,
  },
  paymaster: {
    type: String,
  },
  actualGasCost: {
    type: Number,
  },
  actualGasUsed: {
    type: Number,
  },
  reason: {
    type: String,
  },
  logs: {
    type: Object,
  },
  receipt: {
    type: Object,
  },
  creationTime: {
    type: Number,
  },
  metaData: {
    type: Object,
  },
  dappAPIKey: {
    type: String,
  },
});
