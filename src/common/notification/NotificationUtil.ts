import { IEVMAccount } from "../../relayer/account";
import { TransactionType } from "../types";
import { parseError } from "../utils";

// enum for notification levels
enum NotificationLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const getMessage = (level: string, message: any, details: any, action: any) =>
  `Level: ${level} \n Message: ${message}\n\nDETAILS\n${details}${
    action ? `\n\nACTION\n${action}` : ""
  }`;

// const getInfoMessage = (message: string, details: string, action: string | undefined)
// => getMessage('INFO', message, details, action || 'None');

export const getMaxRetryCountNotificationMessage = (
  transactionId: string,
  account: IEVMAccount,
  transactionType: TransactionType,
  chainId: number,
) => {
  const message = "TW Setup: Transaction Max retry Count Exceeded";
  const details = `TransactionId: ${transactionId}\n has exceeded max retry count.\nRelayer Address: ${account.getPublicKey()}\nTransaction Type: ${transactionType}\nChain Id: ${chainId}`;
  const action =
    "Please observe and wait for the transaction to be mined. If the transaction is not mined at the earliest, please send a transaction with higher gas price";
  return getMessage(NotificationLevel.WARN, message, details, action);
};

export const getTransactionErrorNotificationMessage = (
  transactionId: string,
  chainId: number,
  error: any,
) => {
  const message = "TW Setup: Transaction Error";
  // check if error is string or object
  const errorString = typeof error === "string" ? error : parseError(error);
  const details = `TransactionId: ${transactionId}\nChain Id: ${chainId}\nError: ${errorString}`;
  const action = undefined;
  return getMessage(NotificationLevel.ERROR, message, details, action);
};

export const getTransactionNoOpNotificationMessage = (
  transactionId: string,
  chainId: number,
) => {
  const message = "TW Setup: Transaction No Op";
  const details = `TransactionId: ${transactionId}\nChain Id: ${chainId}`;
  const action = undefined;
  return getMessage(NotificationLevel.INFO, message, details, action);
};

export const getRelayerFundingNotificationMessage = (
  relayerAddress: string,
  chainId: number,
  transactionHash: string,
) => {
  const message = "TW Setup: Relayer Funding";
  const details = `Relayer Address: ${relayerAddress}\nChain Id: ${chainId}\nTransaction Hash: ${transactionHash}`;
  const action = undefined;
  return getMessage(NotificationLevel.INFO, message, details, action);
};

export const getPendingTransactionIncreasingMessage = (
  relayerAddress: string,
  chainId: number,
  pendingCount: number,
) => {
  const message = "TW Setup: Relayer Pending Transaction Increasing";
  const details = `Relayer Address: ${relayerAddress}\nChain Id: ${chainId}\nPending Transaction Count: ${pendingCount}`;
  const action =
    "Keep an eye on the pending transaction count. If the pending transaction count is increasing, please increase the gas price of the transaction or check for stuck transactions";
  return getMessage(NotificationLevel.WARN, message, details, action);
};

export const getAccountUndefinedNotificationMessage = (
  transactionId: string,
  relayerAddress: string,
  transactionType: string,
  relayerManagerName: string,
) => {
  const message = "TW Setup: Account Undefined";
  const details = `TransactionId: ${transactionId}\nRelayer Address: ${relayerAddress}\nTransaction Type: ${transactionType}\nRelayer Manager Name: ${relayerManagerName}`;
  const action = undefined;
  return getMessage(NotificationLevel.ERROR, message, details, action);
};
