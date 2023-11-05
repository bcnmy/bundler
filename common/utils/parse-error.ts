import { serializeError } from 'serialize-error';

export const parseError = (error: any): string => {
  let errorMessage: string = '';
  if (error instanceof Error) {
    try {
      errorMessage = serializeError(error)?.message || JSON.stringify(error);
    } catch (err) {
      // ignore
      errorMessage = JSON.stringify(error);
    }
  } else {
    try {
      errorMessage = JSON.stringify(error);
    } catch (err) {
      // ignore
      errorMessage = error;
    }
  }

  try {
    return errorMessage.toString().replace(/\b(https?):\/\/[-\w+&@#/%?=~|!:,.;]*[-\w+&@#/%=~|]/g, 'URL');
  } catch (err2) {
    // ignore
    errorMessage = error;
  }
  return errorMessage;
};
