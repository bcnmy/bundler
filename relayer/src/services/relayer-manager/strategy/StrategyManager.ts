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
    this.strategy.doAlgorithm();
  }
}
