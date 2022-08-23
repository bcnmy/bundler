import { Network } from 'network-sdk';
import { ethers } from 'ethers';
import { redisClient } from '../db';
import { logger } from '../log-config';
import { getGasPriceKey } from '../../relayer/src/utils/cache-utils';

const log = logger(module);

export class GasPrice {
  private networkId: number;

  private network: Network;

  private gasPrice: string;

  constructor(networkId: number, network: Network) {
    this.networkId = networkId;
    this.network = network;
    this.gasPrice = '';
  }

  async setGasPrice() {
    const gasPriceInHex = (await this.network.getGasPrice()).gasPrice;
    this.gasPrice = ethers.BigNumber.from(gasPriceInHex).toNumber().toString();
    await redisClient.set(getGasPriceKey(this.networkId), this.gasPrice);
    log.info(`Gas price for ${this.networkId} is set at ${this.gasPrice}`);
  }

  async getGasPrice() {
    let gasPrice = await redisClient.get(getGasPriceKey(this.networkId));
    if (!gasPrice) {
      await this.getGasPrice();
      gasPrice = this.gasPrice;
    }
    return gasPrice;
  }

  scheduleForUpdate(frequencyInSeconds: number = 30) {
    setInterval(this.setGasPrice.bind(this), frequencyInSeconds * 1000);
  }
}
