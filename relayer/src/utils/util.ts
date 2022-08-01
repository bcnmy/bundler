const stringify = (data: any) => {
  let dataString = data;
  if (typeof data === 'object') {
    dataString = JSON.stringify(data);
  }
  return dataString;
};

export {
  stringify,
};
