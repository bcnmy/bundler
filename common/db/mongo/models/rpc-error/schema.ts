import mongoose from 'mongoose';
import { IRPCError } from '../../interface';

const { Schema } = mongoose;

export const RPCErrorSchema = new Schema<IRPCError>({
  transactionId: {
    type: String,
  },
  providerName: {
    type: String,
  },
  rawRequest: {
    type: Object,
  },
  rawResponse: {
    type: Object,
  },
});
