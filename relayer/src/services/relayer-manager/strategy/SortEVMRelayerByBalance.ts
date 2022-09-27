import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerMetaDataType } from '../types';

export class SortEVMRelayerByBalance implements IStrategy {
  relayerMapData: Array<EVMRelayerMetaDataType>;

  constructor(relayerMapData: Array<EVMRelayerMetaDataType>) {
    this.relayerMapData = relayerMapData;
  }

  public doAlgorithm(): EVMRelayerMetaDataType[] {
    return this.relayerMapData.sort((a, b) => a.balance - b.balance);
  }
}
