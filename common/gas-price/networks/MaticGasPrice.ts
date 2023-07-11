import { schedule } from 'node-cron';
import { config } from '../../../config';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { ICacheService } from '../../cache';
import { logger } from '../../log-config';
import { INetworkService } from '../../network';
import { IScheduler } from '../../scheduler';
import { EVMRawTransactionType } from '../../types';
import { GasPrice } from '../GasPrice';
import { parseError } from '../../utils';

const log = logger(module);

export class MaticGasPrice extends GasPrice implements IScheduler {
  updateFrequencyInSeconds: number;

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number,
      EIP1559SupportedNetworks: Array<number>
    },
  ) {
    super(cacheService, networkService, options);
    this.updateFrequencyInSeconds = config.gasPrice[this.chainId].updateFrequencyInSeconds || 60;
  }

  schedule() {
    schedule(`*/${this.updateFrequencyInSeconds} * * * * *`, () => {
      this.setup();
    });
  }

  async setup() {
    await this.owlracleForEIP1559().catch(
      async (owlracleError: any) => {
        log.error(`[OWLRACLE] Error in fetching gas price for EIP1559: ${(parseError(owlracleError))}`);
        await this.polygonScanForEIP1559().catch(
          async (polygonScanError: any) => {
            log.error(`[POLYGONSCAN] Error in fetching gas price for EIP1559: ${(parseError(polygonScanError))}`);
            await this.rpcForEIP1559().catch(
              async (rpcError: any) => {
                log.error(`[RPC] Error in fetching gas price for EIP1559: ${(parseError(rpcError))}`);
                await this.setDefaultEIP1559();
              },
            );
          },
        );
      },
    );
  }

  async owlracleForEIP1559() {
    const { chainId } = this.networkService;
    log.info(chainId);
  }

  async polygonScanForEIP1559() {
    const { chainId } = this.networkService;
    log.info(chainId);
  }

  async rpcForEIP1559() {
    const { chainId } = this.networkService;
    log.info(chainId);
  }

  async setDefaultEIP1559() {
    const { chainId } = this.networkService;
    log.info(chainId);
  }
}
