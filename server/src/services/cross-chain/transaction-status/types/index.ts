import type { StatusCodes } from 'http-status-codes';
import type {
  CrossChainTransationStatus,
  CrossChainTransactionError,
  TransactionStatus,
} from '../../../../../../common/types';

export type CrossChainTransactionStatusResult = {
  responseCode: StatusCodes;
  sourceTransactionStatus?: CrossChainTransationStatus;
  destinationTransactionStatus?: TransactionStatus;
  destinationChainTxHash?: string;
  error?: CrossChainTransactionError;
  context?: any;
};
