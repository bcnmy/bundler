import { Network } from 'network-sdk';
import { ethers } from 'ethers';
import { logger } from '../log-config';
import { getGasPriceKey } from '../../relayer/src/utils/cache-utils';

const log = logger(module);

export class GasPrice {
  private chainId: number;

  private network: Network;

  private gasPrice: string;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.network = network;
    this.gasPrice = '';
  }

  async setGasPrice() {
    const gasPriceInHex = (await this.network.getGasPrice()).gasPrice;
    this.gasPrice = ethers.BigNumber.from(gasPriceInHex).toNumber().toString();
    // await redisClient.set(getGasPriceKey(this.chainId), this.gasPrice);
    log.info(`Gas price for ${this.chainId} is set at ${this.gasPrice}`);
  }

  async getGasPrice(): Promise<string> {
    // let gasPrice = await redisClient.get(getGasPriceKey(this.chainId));
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
