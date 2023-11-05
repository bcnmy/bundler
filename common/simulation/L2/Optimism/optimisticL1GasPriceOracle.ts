import { BigNumber, ethers } from 'ethers';
import { OptimisticGasPriceOracleABI } from './abi';

export class OptimisticL1GasPriceOracle {
  private _optimisticGasPriceOracle;

  constructor(
    provider: ethers.providers.BaseProvider,
    gasPriceOracle = '0x420000000000000000000000000000000000000F',
  ) {
    this._optimisticGasPriceOracle = new ethers.Contract(
      gasPriceOracle,
      OptimisticGasPriceOracleABI,
      provider,
    );
  }

  public async decimals(): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.decimals();
  }

  public async gasPrice(): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.gasPrice();
  }

  public async getL1Fee(data: string): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.getL1Fee(data);
  }

  public async getL1GasUsed(data: string): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.getL1GasUsed(data);
  }

  public async l1BaseFee(): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.l1BaseFee();
  }

  public async overhead(): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.overhead();
  }

  public async scalar(): Promise<BigNumber> {
    return this._optimisticGasPriceOracle.scalar();
  }
}
