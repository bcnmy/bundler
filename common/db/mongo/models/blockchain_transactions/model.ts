import mongoose from 'mongoose';
import { IBlockchainTransaction } from '../../interface/IBlockchainTransaction';
import { BlockchainTransactionSchema } from './schema';

const supportedNetworks = process.env.SUPPORTED_NETWORKS || [];

type BlockchainTransactionsMapType = {
  [networkId: string]: mongoose.Model<IBlockchainTransaction, {}, {}, {}>;
};

const BlockchainTransactionsMap: BlockchainTransactionsMapType = {};

for (const networkId of supportedNetworks) {
  const collectionName = `BlockchainTransactions_${networkId}`;
  BlockchainTransactionsMap[networkId] = mongoose.model(
    collectionName,
    BlockchainTransactionSchema,
  );
}

export { BlockchainTransactionsMap };
