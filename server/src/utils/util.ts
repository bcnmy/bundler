export const stringify = (data: any) => {
  let dataString = data;
  if (typeof data === 'object') {
    dataString = JSON.stringify(data);
  }
  return dataString;
};

export const sanitizeParams = (params: Array<any>) => {
  let result;
  if (params) {
    result = [];
    for (let i = 0; i < params.length; i += 1) {
      if (typeof params[i] === 'number') {
        result.push(params[i]);
      } else {
        result.push(params[i]);
      }
    }
  }
  return result;
};
