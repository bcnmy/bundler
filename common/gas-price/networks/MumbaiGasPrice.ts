import { config } from '../../../config';
import { EVMAccount } from '../../../relayer/src/services/account';
import { ICacheService } from '../../cache';
import { INetworkService } from '../../network';
import { IScheduler } from '../../scheduler';
import { EVMRawTransactionType } from '../../types';
import { AbstractGasPrice } from '../AbstactGasPrice';

export class MumbaiGasPrice extends AbstractGasPrice implements IScheduler {
  updateFrequencyInSeconds: number;

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number,
      EIP1559SupportedNetworks: Array<number>
    },
  ) {
    super(cacheService, networkService, options);
    this.updateFrequencyInSeconds = config.gasPrice[this.chainId].updateFrequencyInSeconds || 60;
  }

  async setup() {
    console.log(this.chainId);
  }

  schedule() {
    setInterval(this.setup, this.updateFrequencyInSeconds * 1000);
  }
}
