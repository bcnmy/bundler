export const bigIntToString = (args: any, visited = new Set()): any => {
  if (visited.has(args)) {
    // Circular reference detected, return null or handle as needed
    return null;
  }

  visited.add(args);

  if (typeof args === "object") {
    const result: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "bigint") {
        // Convert BigInt to string
        result[key] = value.toString();
      } else if (
        typeof value === "object" ||
        ((value as any).length && (value as any).length > 0)
      ) {
        result[key] = bigIntToString(value, visited);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  const result: any = [];

  for (const element of args) {
    if (typeof element === "bigint") {
      // Convert BigInt to string
      result.push(element.toString());
    } else if (
      typeof element === "object" ||
      ((element as any).length && (element as any).length > 0)
    ) {
      result.push(bigIntToString(element, visited));
    } else {
      result.push(element);
    }
  }

  visited.delete(args);

  return result;
};
