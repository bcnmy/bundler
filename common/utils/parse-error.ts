import { serializeError } from 'serialize-error';

export const parseError = (error: any): string => {
  if (error instanceof Error) {
    let errorMessage = JSON.stringify(error);
    try {
      errorMessage = serializeError(error)?.message || errorMessage;
    } catch (err) {
      console.error('failed to parse error');
    }
    return errorMessage;
  }
  return error;
};
