import {
  number,
  object,
  string,
} from 'yup';

export const relaySchema = object({
  body: object({
    from: string().matches(/^0x[a-fA-F0-9]{40}$/).required('from address is required'),
    to: string().matches(/^0x[a-fA-F0-9]{40}$/).required('to address is required'),
    gasLimit: string(),
    destinationData: string().required('data is required'),
    chainId: number().required('chain id (network id) is required'),
  }),
});
