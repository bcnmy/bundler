import mongoose from 'mongoose';

const { Schema } = mongoose;
export interface IBlockchainTransaction {
  transactionId: string;
  transactionHash: string;
  previousTransactionHash: string;
  status: string;
  metaTxData: object;
  metaTxApproach: string;
  rawTransaction: object;
  networkId: number;
  gasPrice: string;
  contractAddress: string;
  receipt: object;
  relayerAddress: string;
  signerAddress: string;
  transactionFee: number;
  transactionFeeCurrency: string;
  baseCurrencyInFiat?: number;
  transactionFeeInFiat?: number;
  transactionFeeInFiatCurrency?: string;
  gasUsed: number;
  gasLimit: number;
  resubmitted: boolean;
  creationTime: number;
  updationTime: number;
  ipAddress: string;
}

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
