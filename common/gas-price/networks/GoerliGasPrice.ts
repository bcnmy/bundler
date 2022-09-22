import { EVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { IScheduler } from '../../scheduler';
import { EVMRawTransactionType } from '../../types';
import { AbstractGasPrice } from '../AbstactGasPrice';

export class GoerliGasPrice extends AbstractGasPrice implements IScheduler {
  updateFrequencyInSeconds: number;

  constructor(
    chainId: number,
    updateFrequencyInSeconds: number,
    network?: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    super(chainId, network);
    this.updateFrequencyInSeconds = updateFrequencyInSeconds;
  }

  setup = async (): Promise<void> => {
    console.log(this.chainId);
  };

  schedule() {
    setInterval(this.setup, this.updateFrequencyInSeconds * 1000);
  }
}
