import { Network } from 'network-sdk';
import { schedule } from 'node-cron';
import { logger } from '../../../../common/log-config';

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
    log.info(`Gas price for ${this.networkId} is set at ${this.gasPrice}`);
  }

  async getGasPrice() {
    return this.gasPrice;
  }

  scheduleForUpdate(frequencyInSeconds: number = 600) {
    schedule(`*/${frequencyInSeconds} * * * * *`, () => {
      this.setGasPrice();
    });
  }
}
