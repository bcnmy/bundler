export const bigIntToNumber = (args: any): any => {
  if(typeof args === 'object') {
    const result: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'bigint') {
        // Convert BigInt to string
        result[key] = value.toString();
      } else {
        result[key] = value;
      }
    }
    return result;
  } 
  const result: any = [];

  for (const element of args) {
    if (typeof element === 'bigint') {
      // Convert BigInt to string
      result.push(Number(element));
    } else if (typeof element === "object") {
      result.push(bigIntToNumber(element));
    } else {
      result.push(element);
    }
  }
  return result;
};


export const bigIntToString = (object: any): any => {
  const result: any = {};

  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'bigint') {
      // Convert BigInt to string
      result[key] = value.toString();;
    } else if ((value as any).length >= 0) {
      result[key] = bigIntToNumber(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};