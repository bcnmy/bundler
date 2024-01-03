export const bigIntToString = (object: any): any => {
  const result: any = {};

  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'bigint') {
      // Convert BigInt to string
      result[key] = value.toString();;
    } else {
      result[key] = value;
    }
  }
  return result;
};
