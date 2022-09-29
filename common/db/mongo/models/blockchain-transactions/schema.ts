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
  previousTransactionHash: {
    type: String,
  },
  contractAddress: { type: String },
  networkId: { type: Number },
  status: {
    type: String,
    required: true,
  },
  receipt: {
    type: Object,
    required: true,
  },
  relayerAddress: {
    type: String,
    required: true,
  },
  signerAddress: {
    type: String,
    required: true,
  },
  metaTxData: {
    type: Object,
    required: true,
  },
  rawTransaction: {
    type: Object,
    required: true,
  },
  transactionFee: {
    type: Number,
    required: true,
  },
  transactionFeeCurrency: {
    type: String,
    required: true,
  },
  baseCurrencyInFiat: {
    type: Number,
    required: false,
  },
  transactionFeeInFiat: {
    type: Number,
  },
  transactionFeeInFiatCurrency: {
    type: String,
  },
  gasPrice: {
    type: String,
  },
  gasUsed: {
    type: Number,
  },
  gasLimit: {
    type: Number,
  },
  resubmitted: {
    type: Boolean,
    required: false, // could be made true
  },
  creationTime: {
    type: Number,
    required: true,
  },
  updationTime: {
    type: Number,
  },
  ipAddress: {
    type: String,
  },
});
