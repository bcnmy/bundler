import * as ethers from 'ethers';
import { EVMAccount } from '../../relayer/src/services/account/EVMAccount';
import { ICacheService } from '../cache';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { IGasPrice } from './interface/IGasPrice';
import { GasPriceType } from './types';

const log = logger(module);
export class AbstractGasPrice implements IGasPrice {
  chainId: number;

  network?: INetworkService<EVMAccount, EVMRawTransactionType> | undefined;

  cacheService: ICacheService;

  constructor(
    chainId: number,
    cacheService: ICacheService,
    network?: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    this.chainId = chainId;
    this.network = network;
    this.cacheService = cacheService;
  }

  private getGasPriceKey = (gasType: GasPriceType) => `GasPrice_${this.chainId}_${gasType}`;

  private getMaxFeeGasKey = (gasType: GasPriceType) => `MaxFeeGas_${this.chainId}_${gasType}`;

  private getMaxPriorityFeeGasKey = (gasType: GasPriceType) => `MaxPriorityFeeGas_${this.chainId}_${gasType}`;

  async setGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(this.getGasPriceKey(gasType), price);
  }

  async getGasPrice(gasType: GasPriceType) {
    const result = await this.cacheService.get(this.getGasPriceKey(gasType));
    return result;
  }

  async setMaxFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(this.getMaxFeeGasKey(gasType), price);
  }

  async getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(this.getMaxPriorityFeeGasKey(gasType));
    return result;
  }

  async getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(this.getMaxFeeGasKey(gasType));
    return result;
  }

  async setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(this.getMaxPriorityFeeGasKey(gasType), price);
  }

  async setup(gP?: string) {
    try {
      if (!this.network) {
        throw new Error('network instance not available');
      }
      let gasPrice: string = gP || '';
      if (!gP) {
        const gasPriceFromNetwork = (await this.network.getGasPrice()).gasPrice;
        if (gasPriceFromNetwork) {
          gasPrice = ethers.ethers.utils.isHexString(gasPriceFromNetwork)
            ? parseInt(gasPriceFromNetwork, 16).toString()
            : '';
        }
      }
      await this.setGasPrice(GasPriceType.DEFAULT, gasPrice);

      log.info(`Setting gas price for network id ${this.chainId} as ${gasPrice}`);
    } catch (error) {
      log.info(`Error in setting gas price for network id ${this.chainId} - ${JSON.stringify(error)}`);
    }
  }
}
