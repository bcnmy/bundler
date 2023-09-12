import { TransactionType } from '../types';

// change below to assign relayer manager to transaction type
export const relayerManagerTransactionTypeNameMap = {
  [TransactionType.AA]: 'RM1',
  [TransactionType.SCW]: 'RM1',
  [TransactionType.FUNDING]: 'RM0',
  [TransactionType.BUNDLER]: 'RM1',
};
