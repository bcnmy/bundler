import { EVMRelayerDataType } from '../types';

export class SortEVMRelayerByBalance {
  static performAlgorithm(relayerMapData: EVMRelayerDataType[]): EVMRelayerDataType[] {
    return relayerMapData.sort((a, b) => a.balance - b.balance);
  }
}
