import {
  array,
  mixed,
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
    params: array().of(
      mixed().oneOf([
        {
          sender: string().matches(/^0x[a-fA-F0-9]{40}$/).required('sender address is required'),
          nonce: string().required('nonce is required and should be a hex string'),
          initCode: string(),
          callData: string().required('callData is required and should be a hex string'),
          callGasLimit: string().required('callGasLimit is required and should be a hex string'),
          verificationGasLimit: string().required('verificationGasLimit is required and should be a hex string'),
          preVerificationGas: number().required('preVerificationGas is required and should be a hex string'),
          maxFeePerGas: string().required('maxFeePerGas is required and should be a hex string'),
          maxPriorityFeePerGas: string().required('maxPriorityFeePerGas is required and should be a hex string'),
          paymasterAndData: string(),
          signature: string().required('signature is required'),
        }, {
          entryPointAddress: string().required('entryPointAddress is required'),
        }, {
          chainId: number().required('chainId is required'),
        },
      ]),

    ),
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
