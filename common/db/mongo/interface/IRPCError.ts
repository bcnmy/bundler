export interface IRPCError {
  transactionId: string,
  providerName: string,
  rawRequest: object,
  rawResponse: object
}
