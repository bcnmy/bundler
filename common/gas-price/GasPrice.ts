import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { IEVMAccount } from '../../relayer/src/services/account';
import { ICacheService } from '../cache';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../types';
import { IGasPrice } from './interface/IGasPrice';
import { GasPriceType } from './types';
import { OptimismNetworks } from '../constants';
import { parseError } from '../utils';

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
      chainId: number;
      EIP1559SupportedNetworks: Array<number>;
    },
  ) {
    this.chainId = options.chainId;
    this.EIP1559SupportedNetworks = options.EIP1559SupportedNetworks;
    this.networkService = networkService;
    this.cacheService = cacheService;
  }

  /**
   * Method returns cache key for getting standard gas price from cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns cache key
   */
  private getGasPriceKey = (gasType: GasPriceType) => `GasPrice_${this.chainId}_${gasType}`;

  /**
   * Method returns cache key for getting EIP 1559 max fee per gas from cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns cache key
   */
  private getMaxFeePerGasKey = (gasType: GasPriceType) => `MaxFeeGas_${this.chainId}_${gasType}`;

  /**
   * Method returns cache key for getting EIP 1559 max priority fee per gas from cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns cache key
   */
  private getMaxPriorityFeeGasKey = (gasType: GasPriceType) => `MaxPriorityFeeGas_${this.chainId}_${gasType}`;

  /**
   * Method sets gas price (standard & EIP 1559) in cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @param price the gas price
   */
  async setGasPrice(gasType: GasPriceType, price: NetworkBasedGasPriceType) {
    if (typeof price === 'string') {
      await this.cacheService.set(this.getGasPriceKey(gasType), price);
    } else {
      await this.cacheService.set(
        this.getMaxFeePerGasKey(gasType),
        price.maxFeePerGas,
      );
      await this.cacheService.set(
        this.getMaxPriorityFeeGasKey(gasType),
        price.maxPriorityFeePerGas,
      );
    }
  }

  /**
   * Method gets standard gas price or EIP 1559 gas price
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns the gas price
   */
  async getGasPrice(
    gasType = GasPriceType.DEFAULT,
  ): Promise<NetworkBasedGasPriceType> {
    let result: NetworkBasedGasPriceType;
    if (this.EIP1559SupportedNetworks.includes(this.chainId)) {
      const maxFeePerGas = await this.getMaxFeeGasPrice(gasType);
      const maxPriorityFeePerGas = await this.getMaxPriorityFeeGasPrice(
        gasType,
      );
      if (!maxFeePerGas || !maxPriorityFeePerGas) {
        result = await this.networkService.getEIP1559GasPrice();
      } else {
        result = {
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
      }
      if ([137].includes(this.chainId) && Number(result.maxFeePerGas) < 30000000000) {
        result.maxFeePerGas = '35000000000';
        await this.setMaxPriorityFeeGasPrice(
          GasPriceType.DEFAULT,
          (result.maxFeePerGas).toString(),
        );
      }
    } else {
      const gasPrice = await this.cacheService.get(
        this.getGasPriceKey(gasType),
      );
      if (!gasPrice) {
        const response = await this.networkService.getGasPrice();
        result = response.gasPrice;
      } else {
        result = gasPrice;
      }
    }
    return result;
  }

  /**
   * Method used by Tenderly Simulation call
   * @param gasType Set to DEFAULT
   * @returns gas price
   */
  async getGasPriceForSimulation(
    gasType = GasPriceType.DEFAULT,
  ): Promise<string> {
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

  /**
   * Method gives bumped up gas price in case of resubmitted transaction
   * @param pastGasPrice gas price of original transaction
   * @param bumpingPercentage how much to bump by
   * @returns new bumped up transaction
   */
  getBumpedUpGasPrice(
    pastGasPrice: NetworkBasedGasPriceType,
    bumpingPercentage: number,
  ): NetworkBasedGasPriceType {
    let result;
    log.info(`Bumping up gas price by ${bumpingPercentage}%`);
    log.info(`Past gas price: ${typeof pastGasPrice === 'object' ? JSON.stringify(pastGasPrice) : pastGasPrice}`);

    if (
      this.EIP1559SupportedNetworks.includes(this.chainId)
      && typeof pastGasPrice === 'object'
    ) {
      try {
        let resubmitMaxFeePerGas: number;
        let resubmitMaxPriorityFeePerGas: number;
        const { maxPriorityFeePerGas, maxFeePerGas } = pastGasPrice;
        const pastMaxPriorityFeePerGas = maxPriorityFeePerGas;
        const pastMaxFeePerGas = maxFeePerGas;
        log.info(`Past Max priority fee per gas: ${maxPriorityFeePerGas}`);
        log.info(`Past Max fee per gas: ${maxFeePerGas}`);
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
          < Number(pastMaxPriorityFeePerGas) * 1.11
        ) {
          resubmitMaxPriorityFeePerGas = Number(pastMaxPriorityFeePerGas) * 1.11;
        } else {
          resubmitMaxPriorityFeePerGas = Number(bumpedUpMaxPriorityFeePerGas);
        }

        if (Number(bumpedUpMaxFeePerGas) < Number(pastMaxFeePerGas) * 1.11) {
          resubmitMaxFeePerGas = Number(pastMaxFeePerGas) * 1.11;
        } else {
          resubmitMaxFeePerGas = Number(bumpedUpMaxFeePerGas);
        }

        result = {
          maxFeePerGas: ethers.BigNumber.from(
            resubmitMaxFeePerGas.toString(),
          ).toHexString(),
          maxPriorityFeePerGas: ethers.BigNumber.from(
            resubmitMaxPriorityFeePerGas.toString(),
          ).toHexString(),
        };

        return result;
      } catch (error) {
        log.error(error);
        // return 20 Gwei as default
        log.info('Returning default gas price: 20 Gwei');
        return {
          maxFeePerGas: ethers.BigNumber.from('0x4a817c800').toHexString(),
          maxPriorityFeePerGas: ethers.BigNumber.from('0x3b9aca00').toHexString(),
        };
      }
    }

    let resubmitGasPrice: number;

    const bumpedUpPrice = ethers.utils.hexValue(
      BigNumber.from(pastGasPrice)
        .mul(bumpingPercentage + 100)
        .div(100),
    );
    if (Number(bumpedUpPrice) < 1.1 * Number(pastGasPrice)) {
      resubmitGasPrice = 1.1 * Number(pastGasPrice);
    } else {
      resubmitGasPrice = Number(bumpedUpPrice);
    }

    result = ethers.BigNumber.from(resubmitGasPrice.toString()).toHexString();
    return result;
  }

  /**
   * Method sets EIP 1559 max fee gas
   * @param gasType DEFAULT | MEDIUM | FAST
   * @param price price of max fee gas
   */
  async setMaxFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(
      this.getMaxFeePerGasKey(gasType),
      parseInt(price, 10).toString(),
    );
  }

  /**
   * Method gets EIP 1559 max fee gas
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns price of max fee gas
   */
  async getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(
      this.getMaxFeePerGasKey(gasType),
    );
    return result;
  }

  /**
   * Method gets EIP 1559 max priority fee gas
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns price of max priority fee gas
   */
  async getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
    const result = await this.cacheService.get(
      this.getMaxPriorityFeeGasKey(gasType),
    );
    return result;
  }

  /**
   * Method sets EIP 1559 max priority fee gas
   * @param gasType DEFAULT | MEDIUM | FAST
   * @param price price of max priority fee gas
   */
  async setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string) {
    await this.cacheService.set(
      this.getMaxPriorityFeeGasKey(gasType),
      parseInt(price, 10).toString(),
    );
  }

  /**
   * Method sets up gas price manager
   * @param gP the gas price to set
   */
  async setup(gP?: string) {
    try {
      if (!this.networkService) {
        throw new Error('network instance not available');
      }
      let gasPrice: string = gP || '';
      if (!gP) {
        const gasPriceFromNetwork = (await this.networkService.getGasPrice())
          .gasPrice;
        if (gasPriceFromNetwork) {
          gasPrice = ethers.ethers.utils.isHexString(gasPriceFromNetwork)
            ? parseInt(gasPriceFromNetwork, 16).toString()
            : '';
        }

        // check if the network supports EIP 1559
        if (this.EIP1559SupportedNetworks.includes(this.chainId)) {
          if (OptimismNetworks.includes(this.chainId)) {
            try {
              const {
                data,
              } = await this.networkService.sendRpcCall('eth_gasPrice', []);
              const maxPriorityFeePerGas = ethers.utils.formatUnits(
                data.result,
                'wei',
              );
              await this.setMaxPriorityFeeGasPrice(
                GasPriceType.DEFAULT,
                maxPriorityFeePerGas,
              );
              await this.setMaxFeeGasPrice(
                GasPriceType.DEFAULT,
                maxPriorityFeePerGas,
              );
            } catch (error) {
              log.info(`Error in getting network gas price from RPC: ${parseError(error)}`);
              await this.setMaxPriorityFeeGasPrice(
                GasPriceType.DEFAULT,
                '250000000',
              );
              await this.setMaxFeeGasPrice(
                GasPriceType.DEFAULT,
                '250000000',
              );
            }
          } else if ([137].includes(this.chainId)) {
            const {
              data,
            } = await this.networkService.sendRpcCall('eth_gasPrice', []);
            const maxFeePerGas = ethers.utils.formatUnits(
              data.result,
              'wei',
            );
            let maxPriorityFeePerGas = Number(maxFeePerGas) * 0.3;
            if (maxPriorityFeePerGas < 30000000000) {
              maxPriorityFeePerGas = 30000000000;
            }
            await this.setMaxPriorityFeeGasPrice(
              GasPriceType.DEFAULT,
              maxPriorityFeePerGas.toString(),
            );
            await this.setMaxFeeGasPrice(
              GasPriceType.DEFAULT,
              (Number(maxFeePerGas) * 1.5).toString(),
            );
          } else if ([80001].includes(this.chainId)) {
            const {
              data,
            } = await this.networkService.sendRpcCall('eth_gasPrice', []);
            const maxFeePerGas = ethers.utils.formatUnits(
              data.result,
              'wei',
            );
            const maxPriorityFeePerGas = Number(maxFeePerGas) * 0.5;
            await this.setMaxPriorityFeeGasPrice(
              GasPriceType.DEFAULT,
              maxPriorityFeePerGas.toString(),
            );
            await this.setMaxFeeGasPrice(
              GasPriceType.DEFAULT,
              (Number(maxFeePerGas) * 1.5).toString(),
            );
          } else {
            const maxFeePerGasFromNetwork = (await this.networkService
              .getEIP1559GasPrice()).maxFeePerGas;
            const maxPriorityFeePerGasFromNetwork = (await this.networkService
              .getEIP1559GasPrice())
              .maxPriorityFeePerGas;
            if (maxFeePerGasFromNetwork && maxPriorityFeePerGasFromNetwork) {
              const maxFeePerGas = ethers.utils.formatUnits(
                maxFeePerGasFromNetwork,
                'wei',
              );
              const maxPriorityFeePerGas = ethers.utils.formatUnits(
                maxPriorityFeePerGasFromNetwork,
                'wei',
              );

              await this.setMaxFeeGasPrice(GasPriceType.DEFAULT, maxFeePerGas);
              await this.setMaxPriorityFeeGasPrice(
                GasPriceType.DEFAULT,
                maxPriorityFeePerGas,
              );
            }
          }
        }
      }
      await this.setGasPrice(GasPriceType.DEFAULT, gasPrice);

      log.info(
        `Setting gas price for chainId: ${this.chainId} as ${gasPrice}`,
      );
    } catch (error) {
      log.info(
        `Error in setting gas price for network id ${this.chainId} - ${error}`,
      );
    }
  }
}
