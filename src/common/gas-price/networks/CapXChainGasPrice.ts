import { schedule } from "node-cron";
import { IEVMAccount } from "../../../relayer/account";
import { ICacheService } from "../../cache";
import { INetworkService } from "../../network";
import { IScheduler } from "../../scheduler";
import { EVMRawTransactionType } from "../../types";
import { GasPrice } from "../GasPrice";

export class CapXChainGasPrice extends GasPrice implements IScheduler {
  updateFrequencyInSeconds: number;

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number;
      EIP1559SupportedNetworks: Array<number>;
      updateFrequencyInSeconds: number;
    },
  ) {
    super(cacheService, networkService, options);
    this.updateFrequencyInSeconds = options.updateFrequencyInSeconds;
  }

  schedule() {
    schedule(`*/${this.updateFrequencyInSeconds} * * * * *`, () => {
      this.setup();
    });
  }
}
