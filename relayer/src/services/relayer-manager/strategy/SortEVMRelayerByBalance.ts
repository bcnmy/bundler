import { RelayerDataType } from '../types';

export class SortEVMRelayerByBalance {
  static performAlgorithm(relayerMapData: RelayerDataType[]): RelayerDataType[] {
    return relayerMapData.sort((a, b) => a.balance.sub(b.balance).toNumber());
  }
}
