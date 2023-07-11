import { schedule } from 'node-cron';
import { config } from '../../../config';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { ICacheService } from '../../cache';
import { logger } from '../../log-config';
import { INetworkService } from '../../network';
import { IScheduler } from '../../scheduler';
import { EVMRawTransactionType } from '../../types';
import { GasPrice } from '../GasPrice';
import { axiosGetCall, parseError } from '../../utils';
import { GasFeesType, GasPriceType } from '../types';

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

  async setGasFeesInCache(gasFees: GasFeesType) {
    const {
      safeMaxPriorityFee,
      safeMaxFee,
      mediumMaxPriorityFee,
      mediumMaxFee,
      fastMaxPriorityFee,
      fastMaxFee,
    } = gasFees;
    log.info(`Safe Max Priority Fee for Polygon is ${safeMaxPriorityFee} gwei`);
    log.info(`Safe Max Fee for Polygon is ${safeMaxFee} gwei`);
    log.info(`Medium Max Priority Fee for Polygon is ${mediumMaxPriorityFee} gwei`);
    log.info(`Medium Max Fee for Polygon is ${mediumMaxFee} gwei`);
    log.info(`Fast Max Priority Fee for Polygon is ${fastMaxPriorityFee} gwei`);
    log.info(`Fast Max Fee for Polygon is ${fastMaxFee} gwei`);

    const safeMaxPriorityFeeInWei = safeMaxPriorityFee * 1e9;
    const safeMaxFeeInWei = safeMaxFee * 1e9;
    const mediumMaxPriorityFeeInWei = mediumMaxPriorityFee * 1e9;
    const mediumMaxFeeInWei = mediumMaxFee * 1e9;
    const fastMaxPriorityFeeInWei = fastMaxPriorityFee * 1e9;
    const fastMaxFeeInWei = fastMaxFee * 1e9;

    log.info(`Safe Max Priority Fee for Polygon is ${safeMaxPriorityFeeInWei} wei`);
    log.info(`Safe Max Fee for Polygon is ${safeMaxFeeInWei} wei`);
    log.info(`Medium Max Priority Fee for Polygon is ${mediumMaxPriorityFeeInWei} wei`);
    log.info(`Medium Max Fee for Polygon is ${mediumMaxFeeInWei} wei`);
    log.info(`Fast Max Priority Fee for Polygon is ${fastMaxPriorityFeeInWei} wei`);
    log.info(`Fast Max Fee for Polygon is ${fastMaxFeeInWei} wei`);

    if (safeMaxPriorityFeeInWei
        && safeMaxFeeInWei
        && mediumMaxPriorityFeeInWei
        && mediumMaxFeeInWei
        && fastMaxPriorityFeeInWei
        && fastMaxFeeInWei) {
      await this.setMaxFeeGasPrice(
        GasPriceType.DEFAULT,
        (safeMaxFeeInWei).toString(),
      );

      await this.setMaxPriorityFeeGasPrice(
        GasPriceType.DEFAULT,
        safeMaxPriorityFeeInWei.toString(),
      );

      await this.setMaxFeeGasPrice(
        GasPriceType.MEDIUM,
        mediumMaxFeeInWei.toString(),
      );

      await this.setMaxPriorityFeeGasPrice(
        GasPriceType.MEDIUM,
        mediumMaxPriorityFeeInWei.toString(),
      );

      await this.setMaxFeeGasPrice(
        GasPriceType.FAST,
        fastMaxFeeInWei.toString(),
      );

      await this.setMaxPriorityFeeGasPrice(
        GasPriceType.FAST,
        fastMaxPriorityFeeInWei.toString(),
      );
    }
  }

  async owlracleForEIP1559() {
    const data = await axiosGetCall(config.gasPrice[this.chainId].gasOracle.owlracle);
    log.info(`Response from owlracle: ${JSON.stringify(data)}`);
    const {
      speeds,
    } = data;

    const safeEIP1559Prices = speeds[speeds.length - 3];
    const mediumEIP1559Prices = speeds[speeds.length - 2];
    const fastEIP1559Prices = speeds[speeds.length - 1];

    const safeMaxPriorityFee = safeEIP1559Prices.maxPriorityFeePerGas;
    const safeMaxFee = safeEIP1559Prices.maxFeePerGas;
    const mediumMaxPriorityFee = mediumEIP1559Prices.maxPriorityFeePerGas;
    const mediumMaxFee = mediumEIP1559Prices.maxFeePerGas;
    const fastMaxPriorityFee = fastEIP1559Prices.maxPriorityFeePerGas;
    const fastMaxFee = fastEIP1559Prices.maxFeePerGas;

    await this.setGasFeesInCache({
      safeMaxPriorityFee,
      safeMaxFee,
      mediumMaxPriorityFee,
      mediumMaxFee,
      fastMaxPriorityFee,
      fastMaxFee,
    });
  }

  async polygonScanForEIP1559() {
    const data = await axiosGetCall(config.gasPrice[this.chainId].gasOracle.polygonScan);
    log.info(`Response from polygonscan API: ${JSON.stringify(data)}`);

    const {
      result,
    } = data;

    const safeEIP1559Prices = result.SafeGasPrice;
    const mediumEIP1559Prices = result.ProposeGasPrice;
    const fastEIP1559Prices = result.FastGasPrice;
    const { suggestBaseFee } = result;
    const gasUsedRatio = result.gasUsedRatio.split(',')[0] || 0.85;
    log.info(`gasUsedRatio: ${gasUsedRatio}`);

    const safeMaxFee = Number(safeEIP1559Prices);
    const safeMaxPriorityFee = (safeMaxFee - Number(suggestBaseFee))
    * Number(gasUsedRatio);
    const mediumMaxFee = Number(mediumEIP1559Prices);
    const mediumMaxPriorityFee = (safeMaxFee - Number(suggestBaseFee))
    * Number(gasUsedRatio);
    const fastMaxFee = Number(fastEIP1559Prices);
    const fastMaxPriorityFee = (safeMaxFee - Number(suggestBaseFee))
    * Number(gasUsedRatio);

    await this.setGasFeesInCache({
      safeMaxPriorityFee,
      safeMaxFee,
      mediumMaxPriorityFee,
      mediumMaxFee,
      fastMaxPriorityFee,
      fastMaxFee,
    });
  }

  async rpcForEIP1559() {
    const feeData = await this.networkService.getEIP1559GasPrice();
    const {
      maxPriorityFeePerGas,
      maxFeePerGas,
    } = feeData;

    const safeMaxPriorityFee = (Number(maxPriorityFeePerGas) / 1e9) * 1.2;
    const safeMaxFee = (Number(maxFeePerGas) / 1e9) * 1.2;
    const mediumMaxPriorityFee = (Number(maxPriorityFeePerGas) / 1e9) * 1.4;
    const mediumMaxFee = (Number(maxFeePerGas) / 1e9) * 1.4;
    const fastMaxPriorityFee = (Number(maxPriorityFeePerGas) / 1e9) * 1.6;
    const fastMaxFee = (Number(maxFeePerGas) / 1e9) * 1.6;

    await this.setGasFeesInCache({
      safeMaxPriorityFee,
      safeMaxFee,
      mediumMaxPriorityFee,
      mediumMaxFee,
      fastMaxPriorityFee,
      fastMaxFee,
    });
  }

  async setDefaultEIP1559() {
    await this.setGasFeesInCache({
      safeMaxPriorityFee: 30,
      safeMaxFee: 200,
      mediumMaxPriorityFee: 35,
      mediumMaxFee: 250,
      fastMaxPriorityFee: 40,
      fastMaxFee: 350,
    });
  }
}
