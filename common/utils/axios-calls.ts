/* eslint-disable import/no-import-module-exports */
import axios from 'axios';
import { logger } from '../logger';
import { customJSONStringify } from './custom-json-stringifier';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const axiosGetCall = async (url: string, _data?: any) => {
  const { data } = await axios.get(url, _data);
  return data;
};

export const axiosPostCall = async (url: string, _data?: any) => {
  try {
    log.info(`Making axios post call to url: ${url} with data: ${customJSONStringify(_data)}`);
    const { data } = await axios.post(url, _data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.info(`data in axios post call ${customJSONStringify(data)}`);
    return data;
  } catch (error) {
    log.error(`Error in axios post call: ${customJSONStringify(error)}`);
    return null;
  }
};

export const axiosPatchCall = async (url: string, _data?: any) => {
  try {
    log.info(`Making axios patch call to url: ${url} with data: ${customJSONStringify(_data)}`);

    const { data } = await axios.patch(url, _data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.info(`data in axios patch call ${customJSONStringify(data)}`);
    return data;
  } catch (error) {
    log.error(`Error in axios patch call: ${customJSONStringify(error)}`);
    return null;
  }
};
