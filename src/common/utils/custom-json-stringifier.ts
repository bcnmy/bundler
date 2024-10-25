// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customJSONStringify = (object: any) =>
  JSON.stringify(object, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
