import mongoose from 'mongoose';
import { RPCErrorSchema } from './schema';

const RPCErrorModel = mongoose.model(
  'RPC_Error',
  RPCErrorSchema,
);

export { RPCErrorModel };
