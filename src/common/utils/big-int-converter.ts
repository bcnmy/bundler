// eslint-disable-next-line import/no-extraneous-dependencies
import { Decimal128 } from 'mongodb';

export const bigIntToDecimal128 = (object: any): object => {
  const result: any = {};

  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'bigint') {
      // Convert BigInt to Decimal128
      const decimal128Value = Decimal128.fromString(value.toString());
      result[key] = decimal128Value;
    } else {
      result[key] = value;
    }
  }
  return result;
};
