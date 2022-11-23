import type {
  GasFeePaymentArgsStruct,
  CCMPMessage,
} from '../../../../../common/types';

export const keysToLowerCase = (obj: any): any => Object.keys(obj).reduce((acc: any, key) => {
  const newKey = key.charAt(0).toLowerCase() + key.slice(1);
  acc[newKey] = obj[key];
  return acc;
}, {});

export const parseIndexerEvent = (event: Record<string, any>): CCMPMessage => ({
  ...event,
  gasFeePaymentArgs: keysToLowerCase(event.gasFeePaymentArgs) as GasFeePaymentArgsStruct,
  payload: event.payload
    .map((payload: any) => keysToLowerCase(payload))
    .map((payload: any) => ({
      to: payload.to,
      _calldata: payload.calldata,
    })),
} as CCMPMessage);
