import {
  number,
  object,
  string,
} from 'yup';

export const relaySchema = object({
  body: object({
    value: number(),
    to: string().matches(/^0x[a-fA-F0-9]{40}$/).required('to address is required'),
    gasLimit: object().shape({
      hex: string(),
      type: string(),
    }),
    data: string().required('data is required'),
    chainId: number().required('chain id (network id) is required'),
  }),
});

export const simulateOptionsSchema = object({
  body: object({
    // to, data, chainId, refundInfo,
    to: string().required('to address is required'),
    data: string().required('data is required'),
    chainId: number().required('chain id is required'),
    refundInfo: object(),
  }),
});

export const feeOptionsSchema = object({
  query: object({
    chainId: string().oneOf(['5', '80001']),
  }),
});
