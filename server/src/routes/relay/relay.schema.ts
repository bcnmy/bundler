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

export const feeOptionsSchema = object({
  body: object({
    wallet: string(),
    to: string(),
    data: string(),
  }),
});
