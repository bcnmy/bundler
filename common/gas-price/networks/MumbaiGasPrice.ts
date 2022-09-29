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
    chainId: number,
    cacheService: ICacheService,
    network?: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    super(chainId, cacheService, network);
    this.updateFrequencyInSeconds = config.gasPrice[this.chainId].updateFrequencyInSeconds || 60;
  }

  async setup() {
    console.log(this.chainId);
  }

  schedule() {
    setInterval(this.setup, this.updateFrequencyInSeconds * 1000);
  }
}
