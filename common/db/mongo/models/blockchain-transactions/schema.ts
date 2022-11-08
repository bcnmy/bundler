import mongoose from 'mongoose';
import { IBlockchainTransaction } from '../../interface/IBlockchainTransaction';

const { Schema } = mongoose;

export const BlockchainTransactionSchema = new Schema<IBlockchainTransaction>({
  transactionId: {
    type: String,
    required: true,
  },
  transactionHash: {
    type: String,
    required: true,
  },
  chainId: { type: Number },
  status: {
    type: String,
    required: true,
  },
  receipt: {
    type: Object,
  },
  relayerAddress: {
    type: String,
    required: true,
  },
  rawTransaction: {
    type: Object,
    required: true,
  },
  gasPrice: {
    type: String,
  },
  resubmitted: {
    type: Boolean,
    default: false,
  },
  creationTime: {
    type: Number,
    required: true,
  },
  updationTime: {
    type: Number,
  },
});
