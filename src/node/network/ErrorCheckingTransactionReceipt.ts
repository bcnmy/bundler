import { parseError } from "../../common/utils";

export class ErrorCheckingTransactionReceipt extends Error {
  constructor(
    error: any,
    transactionHash: string,
    transactionId: string,
    chainId: number,
  ) {
    super(
      `Error checking transaction receipt: ${parseError(
        error,
      )} for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${chainId}`,
    );
  }
}
