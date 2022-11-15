import axios, { AxiosInstance } from 'axios';
import { logger } from '../log-config';
import type { ISDKBackendService } from './types';
import type { CCMPMessage } from '../types';

const log = logger(module);

export class SDKBackendService implements ISDKBackendService {
  private readonly axios: AxiosInstance;

  constructor(baseURL: string) {
    this.axios = axios.create({
      baseURL,
    });
  }

  public async estimateCrossChainMessageGas(message: CCMPMessage): Promise<{
    gas: number;
    txBaseGas: number;
  }> {
    try {
      log.info(`Estimating gas for cross-chain message: ${JSON.stringify(message)}`);
      const response = await this.axios.post('v1/estimator/cross-chain-message', {
        message,
      });
      if (response.status !== 200) {
        throw new Error(
          `Estimate gas failed with status code: ${response.status}, message: ${response.data}`,
        );
      }
      const { gas, txBaseGas } = response.data.data;
      log.info(
        `Estimated gas for cross-chain message hash: ${message.hash} is gas :${gas}, txBaseGas: ${txBaseGas}`,
      );

      return { gas, txBaseGas };
    } catch (e) {
      log.error(`Error estimating gas for cross-chain message: ${e}`);
      throw e;
    }
  }
}
