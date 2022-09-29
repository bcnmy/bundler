import { EVMRelayerDataType } from '../types';

export class SortEVMRelayerByLeastPendingCount {
  static performAlgorithm(relayerMapData: EVMRelayerDataType[]): EVMRelayerDataType[] {
    return relayerMapData.sort((a, b) => a.pendingCount - b.pendingCount);
  }
}
