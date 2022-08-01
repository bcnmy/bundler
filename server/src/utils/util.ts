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

/* export const getRetryDurationForClient = async (networkId:string) => {
  log.info(`Getting retry duration for client for network id ${networkId}`);
  let retryDuration;
  let defaultNetworkBlockTime = config.defaultBlockTimeNetworkDuration[networkId];
  let averageBlockTime = await cache.get(config.blockTimeKey);
  // set default values in case not found
  if (averageBlockTime) {
    let networkBlockTimeObj = JSON.parse(averageBlockTime);
    retryDuration = networkBlockTimeObj[networkId];
    if (!retryDuration) {
      retryDuration = defaultNetworkBlockTime;
    }
  } else {
    retryDuration = defaultNetworkBlockTime;
  }
  log.info(`Average block time for network id ${networkId} is ${retryDuration}`);
  let retryOffset = config.clientRetryDurationOffsetPerNetwork[networkId];
  if(retryOffset) {
    log.info(
      `Adding offset value ${retryOffset} to average block time for network id ${networkId}`);
    retryDuration += retryOffset;
  }
  return retryDuration;
} */

// const scientificToDecimal = function (paramNum:number) {
//   const nsign = Math.sign(paramNum);
//   // remove the sign
//   let num = Math.abs(paramNum);
//   // if the number is in scientific notation remove it
//   if (/\d+\.?\d*e[\+\-]*\d+/i.test(num.toString())) {
//     const zero = '0';
//     const parts = String(num).toLowerCase().split('e'); // split into coeff and exponent
//     const e = parts.pop(); // store the exponential part
//     let l = Math.abs(e); // get the number of zeros
//     const sign = e / l;
//     const coefficientArray = parts[0].split('.');
//     if (sign === -1) {
//       l -= coefficientArray[0].length;
//       if (l < 0) {
//         num = `${coefficientArray[0].slice(0, l)}.
//       ${coefficientArray[0].slice(l)}
//        ${coefficientArray.length === 2 ? coefficientArray[1] : ''}`;
//       } else {
//         num = `${zero}.${new Array(l + 1).join(zero)}${coefficientArray.join('')}`;
//       }
//     } else {
//       const dec = coefficientArray[1];
//       if (dec) l -= dec.length;
//       if (l < 0) {
//         num = `${coefficientArray[0] + dec.slice(0, l)}.${dec.slice(l)}`;
//       } else {
//         num = coefficientArray.join('') + new Array(l + 1).join(zero);
//       }
//     }
//   }

//   return nsign < 0 ? `-${num}` : `${num}`;
// };
