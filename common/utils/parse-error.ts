import { serializeError } from 'serialize-error';

export const parseError = (error: any): string => {
  if (error instanceof Error) {
    let errorMessage = 'Unable to parse error';
    try {
      errorMessage = serializeError(error)?.message || errorMessage;
    } catch (err) {
      console.error(err);
    }
    return errorMessage;
  }
  return error;
};
