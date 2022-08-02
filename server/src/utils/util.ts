import axios from 'axios';
import { serializeError } from 'serialize-error';
import { config } from '../../config';

export const stringify = (data: any) => {
  let dataString = data;
  if (typeof data === 'object') {
    dataString = JSON.stringify(data);
  }
  return dataString;
};

export const parseError = (error: any) => {
  const result = serializeError(error);
  if (result.message) {
    return result.message;
  }
  return result;
};

export const sanitizeParams = (params:Array<any>) => {
  let result;
  if (params) {
    result = [];
    for (let i = 0; i < params.length; i += 1) {
      if (typeof params[i] === 'number') {
        result.push((params[i]));
      } else {
        result.push(params[i]);
      }
    }
  }
  return result;
};

export const getNFTs = async (networkId: number, address: string) => {
  const baseURL = `${config.conditionalProvider[networkId]}/getNFTs`;
  const fetchURL = `${baseURL}?owner=${address}&withMetadata=false`;
  const response = await axios.get(fetchURL);
  return response.status >= 400 ? {
    error: 'something went wrong',
  } : response.data.ownedNfts;
};
