/* eslint-disable @typescript-eslint/no-explicit-any */
export const convertBigIntToString = (args: any): any => {
  if (typeof args === "bigint") {
    return args.toString();
  }
  if (Array.isArray(args)) {
    return args.map((item) => convertBigIntToString(item));
  }
  if (typeof args === "object" && args !== null) {
    const result: any = {};
    for (const key in args) {
      if (Object.prototype.hasOwnProperty.call(args, key)) {
        result[key] = convertBigIntToString(args[key]);
      }
    }
    return result;
  }
  return args;
};
