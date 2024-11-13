import crypto from "crypto";

const randomInteger = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const generateTransactionId = (data: string) => {
  const hashData = `0x${crypto
    .createHash("sha256")
    .update(data + Date.now() + randomInteger(1, 100000))
    .digest("hex")}`;
  return hashData;
};

/**
 * Generates a unique transaction id used for tracing transactions.
 * It's useful because tx hashes can change due to replacements transactions but this ID stays the same.
 * @returns A unique transaction id
 */
export const uniqueTransactonId = () => {
  return generateTransactionId(Date.now().toString());
};

/**
 * Generates a unique request id used for tracing requests.
 * Based on the current timestamp + random number
 * @returns A unique request id
 */
export const uniqueRequestId = () => {
  return Date.now() + randomInteger(1, 100000);
};
