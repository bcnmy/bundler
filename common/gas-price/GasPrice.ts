import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { IEVMAccount } from '../../relayer/src/services/account';
import { ICacheService } from '../cache';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../types';
import { IGasPrice } from './interface/IGasPrice';
import { GasPriceType } from './types';

const log = logger(module);
export class GasPrice implements IGasPrice {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  EIP1559SupportedNetworks: Array<number>;

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number,
      EIP1559SupportedNetworks: Array<number>
    },
  ) {
    this.chainId = options.chainId;
    this.EIP1559SupportedNetworks = options.EIP1559SupportedNetworks;
    this.networkService = networkService;
    this.cacheService = cacheService;
  }

  private getGasPriceKey = (gasType: GasPriceType) => `GasPrice_${this.chainId}_${gasType}`;

  private getMaxFeePerGasKey = (gasType: GasPriceType) => `MaxFeeGas_${this.chainId}_${gasType}`;

  private getMaxPriorityFeeGasKey = (gasType: GasPriceType) => `MaxPriorityFeeGas_${this.chainId}_${gasType}`;

  async setGasPrice(gasType: GasPriceType, price: NetworkBasedGasPriceType) {
    if (typeof price === 'string') {
      await this.cacheService.set(this.getGasPriceKey(gasType), price);
    } else {
      await this.cacheService.set(this.getMaxFeePerGasKey(gasType), price.maxFeePerGas);
      await this.cacheService.set(
        this.getMaxPriorityFeeGasKey(gasType),
        price.maxPriorityFeePerGas,
      );
    }
  }

  async getGasPrice(gasType = GasPriceType.DEFAULT): Promise<NetworkBasedGasPriceType> {
    let result: NetworkBasedGasPriceType;
    if (this.EIP1559SupportedNetworks.includes(this.chainId)) {
      const maxFeePerGas = await this.getMaxFeeGasPrice(gasType);
      const maxPriorityFeePerGas = await this.getMaxPriorityFeeGasPrice(gasType);
      if (!maxFeePerGas || !maxPriorityFeePerGas) {
        result = await this.networkService.getEIP1559GasPrice();
      } else {
        result = {
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
      }
    } else {
      const gasPrice = await this.cacheService.get(this.getGasPriceKey(gasType));
      if (!gasPrice) {
        const response = await this.networkService.getGasPrice();
        result = response.gasPrice;
      } else {
        result = gasPrice;
      }
    }
    return result;
  }

  async getGasPriceForSimulation(gasType = GasPriceType.DEFAULT): Promise<string> {
    let result: string;
    const gasPrice = await this.cacheService.get(this.getGasPriceKey(gasType));
    if (!gasPrice) {
      const response = await this.networkService.getGasPrice();
      result = response.gasPrice;
    } else {
      result = gasPrice;
    }
    return result;
  }

  getBumpedUpGasPrice(
    pastGasPrice: NetworkBasedGasPriceType,
    bumpingPercentage: number,
  ): NetworkBasedGasPriceType {
    let result;
    if (this.EIP1559SupportedNetworks.includes(this.chainId) && (typeof pastGasPrice === 'object')) {
      let resubmitMaxFeePerGas: number;
      let resubmitMaxPriorityFeePerGas: number;
      const { maxPriorityFeePerGas, maxFeePerGas } = pastGasPrice;
      const pastMaxPriorityFeePerGas = maxPriorityFeePerGas;
      const pastMaxFeePerGas = maxFeePerGas;

      const bumpedUpMaxPriorityFeePerGas = ethers.utils.hexValue(
        BigNumber.from(maxPriorityFeePerGas)
          .mul(bumpingPercentage + 100)
          .div(100),
      );

      const bumpedUpMaxFeePerGas = ethers.utils.hexValue(
        BigNumber.from(pastMaxFeePerGas)
          .mul(bumpingPercentage + 100)
          .div(100),
      );

      if (
        Number(bumpedUpMaxPriorityFeePerGas)
         < Number(pastMaxPriorityFeePerGas) * 1.11) {
        resubmitMaxPriorityFeePerGas = Number(pastMaxPriorityFeePerGas) * 1.11;
      } else {
        resubmitMaxPriorityFeePerGas = Number(pastMaxPriorityFeePerGas);
      }

      if (
        Number(bumpedUpMaxFeePerGas)
         < Number(pastMaxFeePerGas) * 1.11) {
        resubmitMaxFeePerGas = Number(pastMaxFeePerGas) * 1.11;
      } else {
        resubmitMaxFeePerGas = Number(pastMaxFeePerGas);
      }

      result = {
        maxFeePerGas: ethers.BigNumber.from(resubmitMaxPriorityFeePerGas.toString()).toHexString(),
        maxPriorityFeePerGas: ethers.BigNumber.from(resubmitMaxFeePerGas.toString()).toHexString(),
      };
    }
    let resubmitGasPrice: number;

    const bumpedUpPrice = ethers.utils.hexValue(
      BigNumber.from(pastGasPrice)
        .mul(bumpingPercentage + 100)
        .div(100),
    );
    if (
      Number(bumpedUpPrice)
           < 1.1 * Number(pastGasPrice)
    ) {
      resubmitGasPrice = 1.1 * Number(pastGasPrice);
    } else {
      resubmitGasPrice = Number(bumpedUpPrice);
    }

    result = ethers.BigNumber.from(resubmitGasPrice.toString()).toHexString();
    return result;
  }

  async setMaxFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(this.getMaxFeePerGasKey(gasType), price);
  }

  async getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(this.getMaxPriorityFeeGasKey(gasType));
    return result;
  }

  async getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(this.getMaxFeePerGasKey(gasType));
    return result;
  }

  async setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(this.getMaxPriorityFeeGasKey(gasType), price);
  }

  async setup(gP?: string) {
    try {
      if (!this.networkService) {
        throw new Error('network instance not available');
      }
      let gasPrice: string = gP || '';
      if (!gP) {
        const gasPriceFromNetwork = (await this.networkService.getGasPrice()).gasPrice;
        if (gasPriceFromNetwork) {
          gasPrice = ethers.ethers.utils.isHexString(gasPriceFromNetwork)
            ? parseInt(gasPriceFromNetwork, 16).toString()
            : '';
        }
      }
      await this.setGasPrice(GasPriceType.DEFAULT, gasPrice);

      log.info(`Setting gas price for chainId: ${this.chainId} as ${gasPrice}`);
    } catch (error) {
      log.info(`Error in setting gas price for network id ${this.chainId} - ${error}`);
    }
  }
}
