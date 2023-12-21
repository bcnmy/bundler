export const customJSONStringify = (object: any) => JSON.stringify(object, (key, value) => (typeof value === 'bigint' ? value.toString() : value));
