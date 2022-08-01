import {
  object,
  string,
} from 'yup';

export const systemInfoSchema = object({
  query: object({
    networkId: string().matches(/^\d+$/).required('Network Id is required and must be a number'),
  }),
});
