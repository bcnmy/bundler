import {
  object,
  string,
} from 'yup';

export const relaySchema = object({
  query: object({
    networkId: string().matches(/^\d+$/).required('Network Id is required and must be a number'),
  }),
});
