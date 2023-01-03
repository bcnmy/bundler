import axios from 'axios';

export const axiosGetCall = async (url: string, _data?: any) => {
  const { data } = await axios.get(url, _data);
  return data;
};
