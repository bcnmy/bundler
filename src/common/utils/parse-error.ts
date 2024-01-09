import { serializeError } from "serialize-error";
import { customJSONStringify } from "./custom-json-stringifier";

export const parseError = (error: any): string => {
  let errorMessage: string = "";
  if (error instanceof Error) {
    try {
      errorMessage =
        serializeError(error)?.message || customJSONStringify(error);
    } catch (err) {
      // ignore
      errorMessage = customJSONStringify(error);
    }
  } else {
    try {
      errorMessage = customJSONStringify(error);
    } catch (err) {
      // ignore
      errorMessage = error;
    }
  }

  try {
    return errorMessage
      .toString()
      .replace(/\b(https?):\/\/[-\w+&@#/%?=~|!:,.;]*[-\w+&@#/%=~|]/g, "URL");
  } catch (err2) {
    // ignore
    errorMessage = error;
  }
  return errorMessage;
};
