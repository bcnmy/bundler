import {
  number,
  object,
  string,
} from 'yup';

export const scwRequestSchema = object({
  body: object({
    method: string().matches(/eth_sendSmartContractWalletTransaction/),
    params: object({
      value: number(),
      to: string().matches(/^0x[a-fA-F0-9]{40}$/).required('to address is required'),
      gasLimit: string(), // in hex
      data: string().required('data is required'),
      chainId: number().required('chain id (network id) is required'),
      refundInfo: object({
        tokenGasPrice: string().required('tokenGasPrice is required'),
        gasToken: string().required('gasTokenWrong transaction type sent in request is required'),
      }).required('refundInfo is required'),
    }),
    jsonrpc: string().required('jsonrpc is required'),
    id: number().required('id is required'),
  }),
});

export const aaRequestSchema = object({
  body: object({
    method: string().matches(/eth_sendUserOperation/),
    params: object({
      userOp: object({
        sender: string().matches(/^0x[a-fA-F0-9]{40}$/).required('sender address is required'),
        nonce: number().required('nonce is required'),
        initCode: string(),
        callData: string().required('callData is required'),
        callGasLimit: number().required('callGasLimit is required'),
        verificationGasLimit: number().required('verificationGas is required'),
        preVerificationGas: number().required('preVerificationGas is required'),
        maxFeePerGas: number().required('maxFeePerGas is required'),
        maxPriorityFeePerGas: number().required('maxPriorityFeePerGas is required'),
        paymasterAndData: string(),
        signature: string().required('signature is required'),
      }),
      entryPointAddress: string().required('entryPointAddress is required'),
      chainId: number().required('chainId is required'),
    }),
    jsonrpc: string().required('jsonrpc is required'),
    id: number().required('id is required'),
  }),
});

// REVIEW
// Might change
export const crossChainRequestSchema = object({
  body: object({
    method: string().matches(/eth_sendCrossChainTransaction/),
    params: object({
      value: number(),
      to: string().matches(/^0x[a-fA-F0-9]{40}$/).required('to address is required'),
      gasLimit: string(), // in hex
      data: string().required('data is required'),
      chainId: number().required('chain id (network id) is required'),
      refundInfo: object({
        tokenGasPrice: string().required('tokenGasPrice is required'),
        gasToken: string().required('gasTokenWrong transaction type sent in request is required'),
      }).required('refundInfo is required'),
    }),
    jsonrpc: string().required('jsonrpc is required'),
    id: number().required('id is required'),
  }),
});

export const feeOptionsSchema = object({
  query: object({
    chainId: string().oneOf(['5', '80001']),
  }),
});
