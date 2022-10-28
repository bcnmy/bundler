import { serializeError } from 'serialize-error';

export const parseError = (error: any) => {
  const result = serializeError(error);
  if (result.message) {
    return result.message;
  }
  return result;
};

export const stringify = (data: any) => {
  let dataString = data;
  if (typeof data === 'object') {
    dataString = JSON.stringify(data);
  }
  return dataString;
};
