
import { ethers } from 'ethers';
import { logger } from '../log-config';
import { redisClient } from '../service-manager';
import { IAbstractGasPrice } from './interface/index';

const log = logger(module);
export class AbstactGasPrice implements IAbstractGasPrice {
  chainId: number;

  network: INetworkService;

  constructor(chainId: number, network?: INetworkService) {
    this.chainId = chainId;
    this.network = network;
  }

  async setGasPrice(networkId: number, gasType: string, price: string) {
    // save to redis here
    await redisClient.set(this.getGasPriceKey(networkId, gasType), price);
  }

  async getGasPrice(networkId: number, gasType: string) {
    // return gas price here
    const result = await redisClient.get(this.getGasPriceKey(networkId, gasType));
    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  getGasPriceKey(networkId: number, gasType: string) {
    // get redis key for gas price
    const data = `GasPrice_${networkId}_${gasType}`;
    return data;
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
      await this.setGasPrice(this.networkId, this.defaultGasPriceType, gasPrice);

      log.info(`Setting gas price for network id ${this.networkId} as ${gasPrice}`);
    } catch (error) {
      log.info(`Error in setting gas price for network id ${this.networkId} - ${stringify(error)}`);
    }
  }
}
 {
  networkId: number;

  network: Network | undefined;

  defaultGasPriceType: string = config.gasPrice.gasPriceType.DEFAULT;

  mediumGasPriceType: string = config.gasPrice.gasPriceType.MEDIUM;

  fastGasPriceType: string = config.gasPrice.gasPriceType.FAST;

  scheduleTimeForNetworkIds: {
    [key: number]: number,
  } = config.gasPrice.scheduleTimeForNetworkIds;

  constructor(networkId: number, network?: Network) {
    this.networkId = networkId;
    this.network = network;
  }

  async setGasPrice(networkId: number, gasType: string, price: string) {
    // save to redis here
    await redisClient.set(this.getGasPriceKey(networkId, gasType), price);
  }

  async getGasPrice(networkId: number, gasType: string) {
    // return gas price here
    const result = await redisClient.get(this.getGasPriceKey(networkId, gasType));
    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  getGasPriceKey(networkId: number, gasType: string) {
    // get redis key for gas price
    const data = `GasPrice_${networkId}_${gasType}`;
    return data;
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
      await this.setGasPrice(this.networkId, this.defaultGasPriceType, gasPrice);

      log.info(`Setting gas price for network id ${this.networkId} as ${gasPrice}`);
    } catch (error) {
      log.info(`Error in setting gas price for network id ${this.networkId} - ${stringify(error)}`);
    }
  }
}
