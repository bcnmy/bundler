import mongoose from 'mongoose';
import { IBlockchainTransaction } from '../../interface/IBlockchainTransaction';

const { Schema } = mongoose;

export const BlockchainTransactionSchema = new Schema<IBlockchainTransaction>({
  transactionId: {
    type: String,
    // TODO
    // this should be rquired: true
    // required: true,
  },
  transactionHash: {
    type: String,
  },
  previousTransactionHash: {
    type: String,
  },
  chainId: { type: Number },
  status: {
    type: String,
  },
  receipt: {
    type: Object,
  },
  transactionType: {
    type: String,
  },
  relayerAddress: {
    type: String,
  },
  walletAddress: {
    type: String,
  },
  transactionFee: {
    type: Number,
  },
  transactionFeeInUSD: {
    type: Number,
  },
  transactionFeeCurrency: {
    type: String,
  },
  refundTokenAddress: {
    type: String,
  },
  refundTokenCurrency: {
    type: String,
  },
  refundAmount: {
    type: Number,
  },
  refundAmountInUSD: {
    type: Number,
  },
  relayerDestinationContractAddress: {
    type: String,
  },
  relayerDestinationContractName: {
    type: String,
  },
  rawTransaction: {
    type: Object,
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
