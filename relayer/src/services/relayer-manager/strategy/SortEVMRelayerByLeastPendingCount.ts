import { RelayerDataType } from '../types';

export class SortEVMRelayerByLeastPendingCount {
  static performAlgorithm(relayerMapData: RelayerDataType[]): RelayerDataType[] {
    return relayerMapData.sort((a, b) => a.pendingCount - b.pendingCount);
  }
}
