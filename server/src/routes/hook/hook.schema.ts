import {
  number, object, string, array,
} from 'joi';

/**
 * @dev hookSchema - derived from the Webhookoutput struct
 * of https://github.com/bcnmy/indexer/blob/master/models/output.go
 */
export const hookSchema = object({
  body: object({
    id: string().required().error(new Error('id is required')),
    chainId: number().required().error(new Error('chain id is required')),
    from: string().required().error(new Error('from address is required')),
    scAddress: string().required().error(new Error('smart contract address is required')),
    blockHash: string().required().error(new Error('block hash is required')),
    blockNumber: number().required().error(new Error('block number is required')),
    txIndex: number().required().error(new Error('transaction index is required')),
    txHash: string().required().error(new Error('transaction hash is required')),
    txType: number().required().error(new Error('transaction type is required')),
    txStatus: string().required().error(new Error('transaction status is required')),
    txTimestamp: string().required().error(new Error('transaction timestamp is required')),
    gasLimit: number().required().error(new Error('gas limit is required')),
    gasUsage: number().required().error(new Error('gas usage is required')), // TODO: ensure changed to gasuse),
    gasPrice: number().required().error(new Error('gas price is required')),
    txFees: number().required().error(new Error('transaction fees is required')),
    topicId: string().required().error(new Error('topic id is required')),
    event: string().required().error(new Error('event name is required')),
    data: object({
      sender: string(), // .required("sender is required"),
      sourceGateway: string(), // .required("source gateway is required"),
      sourceAdaptor: string(), // .required("source adaptor is required"),
      sourceChainId: string(), // .required("source chain id is required"),
      destinationGateway: string(),
      // .required("destination chain gateway contract address is required"),
      destinationChainId: string(), // .required("destination chain id is required"),
      nonce: string(), // .required("nonce is required"),
      routerAdaptor: string(), // .required("router adaptor is required"),
      gasFeePaymentArgs: object({
        feeTokenAddress: string(), // .required("fee token address is required"),
        feeAmount: string(), // .required("fee amount is required"),
        relayer: string(), // .required("relayer is required"),
      }), // .required("gas fee payment args are required"),
      payload: array().items(
        object({
          operationType: number(), // .required("payload operation type is required"),
          data: string(), // .required("payload data is required")
        }),
      ), // .required("amount is required"),
    }), // .required("event data is required"),
    queuedAt: string(), // .required('queued at timestamp is required'),
    dispatchedAt: string(), // .required("dispatched at timestamp is required"),
  }),
});
