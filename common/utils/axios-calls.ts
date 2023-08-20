import axios from 'axios';
import { logger } from '../log-config';

const log = logger(module);

export const axiosGetCall = async (url: string, _data?: any) => {
  const { data } = await axios.get(url, _data);
  return data;
};

export const axiosPostCall = async (url: string, _data?: any) => {
  try {
    log.info(`Making axios post call to url: ${url} with data: ${JSON.stringify(_data)}`);
    const { data } = await axios.post(url, _data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.info(`data in axios post call ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    log.info(`Error in axios post call: ${JSON.stringify(error)}`);
    return null;
  }
};

export const axiosPatchCall = async (url: string, _data?: any) => {
  try {
    log.info(`Making axios patch call to url: ${url} with data: ${JSON.stringify(_data)}`);

    const { data } = await axios.patch(url, _data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.info(`data in axios patch call ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    log.info(`Error in axios patch call: ${JSON.stringify(error)}`);
    return null;
  }
};
