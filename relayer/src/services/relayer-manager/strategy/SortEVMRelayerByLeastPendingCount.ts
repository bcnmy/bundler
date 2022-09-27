import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerMetaDataType } from '../types';

export class SortEVMRelayerByLeastPendingCount implements IStrategy {
  relayerMapData: Array<EVMRelayerMetaDataType>;

  constructor(relayerMapData: Array<EVMRelayerMetaDataType>) {
    this.relayerMapData = relayerMapData;
  }

  public doAlgorithm(): EVMRelayerMetaDataType[] {
    return this.relayerMapData.sort((a, b) => a.pendingCount - b.pendingCount);
  }
}
