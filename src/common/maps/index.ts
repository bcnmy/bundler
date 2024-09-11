import { TransactionType } from "../types";

// change below to assign relayer manager to transaction type
export const relayerManagerTransactionTypeNameMap = {
  [TransactionType.FUNDING]: "RM0",
  [TransactionType.BUNDLER]: "RM1",
};
