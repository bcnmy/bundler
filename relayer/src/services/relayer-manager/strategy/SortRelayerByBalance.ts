import { IStrategy } from '../interface/IStrategy';

export class SortRelayerByBalance implements IStrategy {
  // eslint-disable-next-line class-methods-use-this
  public doAlgorithm(data: string[]): string[] {
    return data.sort();
  }
}
