import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerDataType } from '../types';

export class SortEVMRelayerByLeastPendingCount implements IStrategy {
  relayerMapData: Array<EVMRelayerDataType>;

  constructor(relayerMapData: Array<EVMRelayerDataType>) {
    this.relayerMapData = relayerMapData;
  }

  public doAlgorithm(): EVMRelayerDataType[] {
    return this.relayerMapData.sort((a, b) => a.pendingCount - b.pendingCount);
  }
}
