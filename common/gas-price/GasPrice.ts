/* eslint-disable import/no-import-module-exports */
import { formatUnits, isHex, toHex } from 'viem';
import { IEVMAccount } from '../../relayer/src/services/account';
import { ICacheService } from '../cache';
import { logger } from '../logger';
import { INetworkService } from '../network';
import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../types';
import { IGasPrice } from './interface/IGasPrice';
import { GasPriceType } from './types';
import { OptimismNetworks } from '../constants';
import { parseError } from '../utils';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });
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
  private getGasFeeKey = (gasType: GasPriceType) => `GasFee_${this.chainId}_${gasType}`;

  /**
   * Method returns cache key for getting EIP 1559 max fee per gas from cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns cache key
   */
  private getMaxFeePerGasKey = (gasType: GasPriceType) => `MaxFeePerGas_${this.chainId}_${gasType}`;

  /**
   * Method returns cache key for getting EIP 1559 max priority fee per gas from cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @returns cache key
   */
  private getMaxPriorityFeePerGasKey = (gasType: GasPriceType) => `MaxPriorityFeePerGas_${this.chainId}_${gasType}`;

  /**
   * Method returns cache key for EIP 1559 Base Fee Per Gas
   */
  private getBaseFeePerGasKey = () => `BaseFeePerGas_${this.chainId}`;

  /**
   * Method sets gas price (standard & EIP 1559) in cache
   * @param gasType DEFAULT | MEDIUM | FAST
   * @param price the gas price
   */
  async setGasPrice(gasType: GasPriceType, price: NetworkBasedGasPriceType) {
    if (typeof price === 'bigint') {
      await this.cacheService.set(this.getGasFeeKey(gasType), price.toString());
    } else {
      await this.cacheService.set(
        this.getMaxFeePerGasKey(gasType),
        price.maxFeePerGas.toString(),
      );
      await this.cacheService.set(
        this.getMaxPriorityFeePerGasKey(gasType),
        price.maxPriorityFeePerGas.toString(),
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
    let gasPrice: NetworkBasedGasPriceType;
    if (this.EIP1559SupportedNetworks.includes(this.chainId)) {
      const maxFeePerGas = BigInt(await this.getMaxFeeGasPrice(gasType));
      const maxPriorityFeePerGas = BigInt(await this.getMaxPriorityFeeGasPrice(
        gasType,
      ));
      if (!maxFeePerGas || !maxPriorityFeePerGas) {
        gasPrice = await this.networkService.getEIP1559FeesPerGas();
      } else {
        gasPrice = {
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
      }
      if ([137].includes(this.chainId) && Number(gasPrice.maxPriorityFeePerGas) < 30000000000) {
        await this.setMaxPriorityFeeGasPrice(
          GasPriceType.DEFAULT,
          '30000000000',
        );
        gasPrice.maxPriorityFeePerGas = BigInt('30000000000');
      }
    } else {
      gasPrice = BigInt(await this.cacheService.get(
        this.getGasFeeKey(gasType),
      ));
      if (!gasPrice) {
        gasPrice = BigInt(await this.networkService.getLegacyGasPrice());
      }
    }
    return gasPrice;
  }

  /**
   * Method used by Tenderly Simulation call
   * @param gasType Set to DEFAULT
   * @returns gas price
   */
  async getGasPriceForSimulation(
    gasType = GasPriceType.DEFAULT,
  ): Promise<bigint> {
    let gasPrice: bigint;
    gasPrice = BigInt(await this.cacheService.get(this.getGasFeeKey(gasType)));
    if (!gasPrice) {
      gasPrice = await this.networkService.getLegacyGasPrice();
    }
    return gasPrice;
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
        const bumpedUpMaxPriorityFeePerGas = toHex(
          (BigInt(maxPriorityFeePerGas) * (BigInt(bumpingPercentage + 100))) / BigInt(100),
        );

        const bumpedUpMaxFeePerGas = toHex(
          (BigInt(maxFeePerGas) * (BigInt(bumpingPercentage + 100))) / BigInt(100),
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
          maxFeePerGas: BigInt(
            resubmitMaxFeePerGas.toString(),
          ),
          maxPriorityFeePerGas: BigInt(
            resubmitMaxPriorityFeePerGas.toString(),
          ),
        };

        return result;
      } catch (error) {
        log.error(error);
        // return 20 Gwei as default
        log.info('Returning default gas price: 20 Gwei');
        return {
          maxFeePerGas: BigInt('0x4a817c800'),
          maxPriorityFeePerGas: BigInt('0x3b9aca00'),
        };
      }
    }

    let resubmitGasPrice: number;

    const bumpedUpPrice = toHex(
      (BigInt(pastGasPrice.toString()) * BigInt(bumpingPercentage + 100)) / BigInt(100),
    );
    if (Number(bumpedUpPrice) < 1.1 * Number(pastGasPrice)) {
      resubmitGasPrice = 1.1 * Number(pastGasPrice);
    } else {
      resubmitGasPrice = Number(bumpedUpPrice);
    }

    result = BigInt(resubmitGasPrice.toString());
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
      this.getMaxPriorityFeePerGasKey(gasType),
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
      this.getMaxPriorityFeePerGasKey(gasType),
      parseInt(price, 10).toString(),
    );
  }

  /**
   * Method seets EIP 1559 base fee per gas
   * @param baseFeePerGas
   */
  async setBaseFeePerGas(baseFeePerGas: number): Promise<void> {
    await this.cacheService.set(
      this.getBaseFeePerGasKey(),
      baseFeePerGas.toString(),
    );
  }

  /**
   * Method returns EIP 1559 base fee per gas
   */
  async getBaseFeePerGas(): Promise<bigint> {
    const baseFeePerGas = await this.cacheService.get(
      this.getBaseFeePerGasKey(),
    );
    return BigInt(baseFeePerGas);
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
        const gasPriceFromNetwork = (await this.networkService.getLegacyGasPrice());
        if (gasPriceFromNetwork) {
          gasPrice = isHex(gasPriceFromNetwork)
            ? parseInt(gasPriceFromNetwork, 16).toString()
            : '';
        }

        // check if the network supports EIP 1559
        if (this.EIP1559SupportedNetworks.includes(this.chainId)) {
          let {
            // eslint-disable-next-line prefer-const
            maxFeePerGas,
            // TODO: Check, use only when eth_maxPriorityFeePerGas is supported by RPC
            maxPriorityFeePerGas,
          } = await this.networkService.getEIP1559FeesPerGas();
          if (OptimismNetworks.includes(this.chainId)) {
            try {
              await this.setMaxPriorityFeeGasPrice(
                GasPriceType.DEFAULT,
                Number(formatUnits(maxPriorityFeePerGas, 9)).toString(),
              );
              await this.setMaxFeeGasPrice(
                GasPriceType.DEFAULT,
                Number(formatUnits(maxFeePerGas, 9)).toString(),
              );
            } catch (error) {
              log.error(`Error in getting network gas price from RPC: ${parseError(error)}`);
              await this.setMaxPriorityFeeGasPrice(
                GasPriceType.DEFAULT,
                '250000000',
              );
              await this.setMaxFeeGasPrice(
                GasPriceType.DEFAULT,
                '250000000',
              );
            }
          } else if ([1].includes(this.chainId)) {
            maxPriorityFeePerGas = BigInt(toHex(maxFeePerGas));
            await this.setMaxPriorityFeeGasPrice(
              GasPriceType.DEFAULT,
              maxPriorityFeePerGas.toString(),
            );
            await this.setMaxFeeGasPrice(
              GasPriceType.DEFAULT,
              formatUnits(maxFeePerGas, 9).toString(),
            );
          } else if ([137].includes(this.chainId)) {
            maxPriorityFeePerGas = BigInt(Number(toHex(maxFeePerGas)) * 0.2);
            if (maxPriorityFeePerGas < BigInt(30000000000)) {
              maxPriorityFeePerGas = BigInt(30000000000);
            }
            await this.setMaxPriorityFeeGasPrice(
              GasPriceType.DEFAULT,
              maxPriorityFeePerGas.toString(),
            );
            await this.setMaxFeeGasPrice(
              GasPriceType.DEFAULT,
              (Number(formatUnits(maxFeePerGas, 9)) * 1.2).toString(),
            );
          } else {
            await this.setMaxFeeGasPrice(GasPriceType.DEFAULT, formatUnits(maxFeePerGas, 9));
            await this.setMaxPriorityFeeGasPrice(
              GasPriceType.DEFAULT,
              formatUnits(maxPriorityFeePerGas, 9),
            );
          }
          if (OptimismNetworks.includes(this.chainId) || [137, 80001]) {
            const baseFeePerGas = await this.networkService.getBaseFeePerGas();
            await this.setBaseFeePerGas(baseFeePerGas);
          }
        }
        await this.setGasPrice(GasPriceType.DEFAULT, BigInt(gasPrice));
      }
      log.info(
        `Setting gas price for chainId: ${this.chainId} as ${gasPrice}`,
      );
    } catch (error) {
      log.error(
        `Error in setting gas price for network id ${this.chainId} - ${error}`,
      );
    }
  }
}
