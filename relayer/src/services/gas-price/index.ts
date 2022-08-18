import { Network } from 'network-sdk';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { getGasPriceKey } from '../../utils/cache-utils';

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
    this.gasPrice = (await this.network.getGasPrice()).gasPrice;
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
    setInterval(() => {
      this.setGasPrice();
    }, frequencyInSeconds * 1000);
  }
}
