import { IStrategy } from '../interface/IStrategy';

export class StrategyManager {
  private strategy: IStrategy;

  constructor(strategy: IStrategy) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: IStrategy) {
    this.strategy = strategy;
  }

  public performAlgorithm(): void {
    console.log('Context: Sorting data using the strategy');
    this.strategy.doAlgorithm();
  }
}
