import axios from 'axios';
import { logger } from '../../../common/log-config';

const log = logger(module);

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

const tenderlyInstance = () => axios.create({
  headers: {
    'X-Access-Key': TENDERLY_ACCESS_KEY || '',
    'Content-Type': 'application/json',
  },
});

// https://rpc.tenderly.co/fork/a7e7d2e6-90dd-4faf-be9d-aa367904c77b

export const simulateService = async (wallet: string, data: string, chainId: string) => {
  try {
    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;
    const tAxios = tenderlyInstance();
    const body = {
      // standard TX fields
      network_id: chainId,
      from: '0xb3d1f43ec5249538c6c0fd4fd6e06b4215ce3000',
      input: data,
      gas: 8000000,
      gas_price: '0',
      value: '0',
      to: wallet,
      // simulation config (tenderly specific)
      save: true,
    };
    const response = await tAxios.post(SIMULATE_URL, body);

    if (!response?.data?.transaction?.status) {
      return {
        code: 400,
        error: response?.data?.transaction?.error_message,
      };
    }

    return {
      code: 200,
      msg: 'Fee options fetched successfully',
      data: [{
        executed: true, succeeded: true, result: '0x', reason: null, gasUsed: response?.data?.transaction?.gas_used, gasLimit: 13079,
      }],
      // resp,
    };
  } catch (error) {
    log.info(error);
    return {
      code: 500,
      error: `Error occured in getting fee options service. Error: ${JSON.stringify(error)}`,
    };
  }
};
