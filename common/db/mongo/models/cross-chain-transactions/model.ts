import mongoose from 'mongoose';
import { config } from '../../../../../config';
import { TransactionType } from '../../../../types';
import { ICrossChainTransaction } from '../../interface/ICrossChainTransaction';
import { CrossChainTransactionSchema } from './schema';

const { supportedNetworks, supportedTransactionType } = config;

export type CrossChainTransactionsMapType = {
  [networkId: number]: mongoose.Model<ICrossChainTransaction, {}, {}, {}>;
};

export const CrossChainTransactionsMap: CrossChainTransactionsMapType = Object.fromEntries(
  supportedNetworks
    .filter((networkId) => supportedTransactionType[networkId]
      ?.includes(TransactionType.CROSS_CHAIN))
    .map((networkId) => {
      const collectionName = `CrossChainTransactions_${networkId}`;
      return [networkId, mongoose.model(collectionName, CrossChainTransactionSchema)];
    }),
);
