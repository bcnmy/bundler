import { EVMRelayerMetaDataType } from '../types';

export class SortEVMRelayerByNonce {
  static performAlgorithm(relayerMapData: EVMRelayerMetaDataType[]): EVMRelayerMetaDataType[] {
    return relayerMapData.sort((a, b) => a.nonce - b.nonce);
  }
}
