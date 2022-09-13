import mongoose from 'mongoose';
import { BlockchainTransactionSchema } from './schema';

const supportedNetworks = process.env.SUPPORTED_NETWORKS || [];

const BlockchainTransactionsMap: any = {};

for (const networkId of supportedNetworks) {
  const collectionName = `BlockchainTransactions_${networkId}`;
  BlockchainTransactionsMap[networkId] = mongoose.model(
    collectionName,
    BlockchainTransactionSchema,
  );
}

export { BlockchainTransactionsMap };
