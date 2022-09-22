import { ethers } from 'ethers';
import { EVMAccount } from '../../relayer/src/services/account/EVMAccount';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { redisClient } from '../service-manager';
import { EVMRawTransactionType } from '../types';
import { IAbstractGasPrice } from './interface/IAbstractGasPrice';
import { GasPriceType } from './types';

const log = logger(module);
export class AbstractGasPrice implements IAbstractGasPrice {
  chainId: number;

  network?: INetworkService<EVMAccount, EVMRawTransactionType> | undefined;

  constructor(
    chainId: number,
    network?: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    this.chainId = chainId;
    this.network = network;
  }

  private getGasPriceKey = (gasType: GasPriceType) => `GasPrice_${this.chainId}_${gasType}`;

  private getMaxFeeGasKey = (gasType: GasPriceType) => `MaxFeeGas_${this.chainId}_${gasType}`;

  private getMaxPriorityFeeGasKey = (gasType: GasPriceType) => `MaxPriorityFeeGas_${this.chainId}_${gasType}`;

  async setGasPrice(gasType: GasPriceType, price: string) {
    await redisClient.set(this.getGasPriceKey(gasType), price);
  }

  async getGasPrice(gasType: GasPriceType) {
    const result = await redisClient.get(this.getGasPriceKey(gasType));
    return result;
  }

  async setMaxFeeGasPrice(gasType: GasPriceType, price: string) {
    await redisClient.set(this.getMaxFeeGasKey(gasType), price);
  }

  async getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await redisClient.get(this.getMaxPriorityFeeGasKey(gasType));
    return result;
  }

  async getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await redisClient.get(this.getMaxFeeGasKey(gasType));
    return result;
  }

  async setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void> {
    await redisClient.set(this.getMaxPriorityFeeGasKey(gasType), price);
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
          gasPrice = ethers.utils.isHexString(gasPriceFromNetwork)
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
