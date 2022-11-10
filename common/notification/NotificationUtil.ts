import { IEVMAccount } from '../../relayer/src/services/account';
import { TransactionDataType } from '../../relayer/src/services/transaction-service';
import { TransactionType } from '../types';

const getMessage = (level: string, message: any, details: any, action: any) => `Level: ${level} \n Message: ${message}\n\nDETAILS\n${details}\n\nAction Required: ${action}`;

const getInfoMessage = (message: string, details: string, action: string | undefined) => getMessage('INFO', message, details, action || 'None');

export const getMaxRetryCountNotificationMessage = (
  transactionData: TransactionDataType,
  account: IEVMAccount,
  transactionType: TransactionType,
) => {
  const message = 'Transaction Max retry Count Exceeded';
  const details = `TransactionId: ${transactionData.transactionId}\n has exceeded max retry count.\nRelayer Address: ${account.getPublicKey()}\nTransaction Type: ${transactionType}`;
  return getInfoMessage(message, details, undefined);
};
