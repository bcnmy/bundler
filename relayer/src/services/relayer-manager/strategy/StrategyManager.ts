import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerMetaDataType } from '../types';

export class StrategyManager<EVMRelayerMetaDataType> {
  private strategy: IStrategy;

  constructor(strategy: IStrategy) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: IStrategy) {
    this.strategy = strategy;
  }

  public performAlgorithm(data: EVMRelayerMetaDataType[]): void {
    console.log('Context: Sorting data using the strategy (not sure how it\'ll do it)');
    const result = this.strategy.doAlgorithm(data);
    console.log(result.join(','));
  }
}
