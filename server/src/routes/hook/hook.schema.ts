import {
    number,
    object,
    string,
    array
} from 'yup';


/**
 * @dev hookSchema - derived from the Webhookoutput struct
 * of https://github.com/bcnmy/indexer/blob/master/models/output.go
 */
export const hookSchema = object({
    body: object({
        id: string().required("id is required"),
        chainId: number().required("chain id is required"),
        from: string().required("from address is required"),
        scAddress: string().required("smart contract address is required"),
        blockHash: string().required("block hash is required"),
        blockNumber: number().required("block number is required"),
        txIndex: number().required("transaction index is required"),
        txHash: string().required("transaction hash is required"),
        txType: number().required("transaction type is required"),
        txStatus: string().required("transaction status is required"),
        txTimestamp: string().required("transaction timestamp is required"),
        gasLimit: number().required("gas limit is required"),
        gasUsage: number().required("gas usage is required"), // TODO: ensure changed to gasused
        gasPrice: number().required("gas price is required"),
        txFees: number().required("transaction fees is required"),
        topicId: string().required("topic id is required"),
        event: string().required("event name is required"),
        data: object({
            sender: string(), //.required("sender is required"),
            sourceGateway: string(), //.required("source gateway is required"),
            sourceAdaptor: string(), //.required("source adaptor is required"),
            sourceChainId: string(), //.required("source chain id is required"),
            destinationGateway: string(), //.required("destination chain gateway contract address is required"),
            destinationChainId: string(), //.required("destination chain id is required"),
            nonce: string(), //.required("nonce is required"),
            routerAdaptor: string(), //.required("router adaptor is required"),
            gasFeePaymentArgs: object({
                feeTokenAddress: string(), //.required("fee token address is required"),
                feeAmount: string(), //.required("fee amount is required"),
                relayer: string(), //.required("relayer is required"),
            }), //.required("gas fee payment args are required"),
            payload: array(object({
                operationType: number(), //.required("payload operation type is required"),
                data: string(), //.required("payload data is required")
            })), //.required("amount is required"),
        }), //.required("event data is required"),
        queuedAt: string().required("queued at timestamp is required"),
        dispatchedAt: string() //.required("dispatched at timestamp is required"),
    }),
});
