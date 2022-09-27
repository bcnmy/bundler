import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerDataType } from '../types';

export class SortEVMRelayerByBalance implements IStrategy {
  relayerMapData: Array<EVMRelayerDataType>;

  constructor(relayerMapData: Array<EVMRelayerDataType>) {
    this.relayerMapData = relayerMapData;
  }

  public doAlgorithm(): EVMRelayerDataType[] {
    return this.relayerMapData.sort((a, b) => a.balance - b.balance);
  }
}
