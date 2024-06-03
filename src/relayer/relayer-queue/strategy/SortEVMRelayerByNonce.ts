import { EVMRelayerMetaDataType } from "../../../common/types";

export class SortEVMRelayerByNonce {
  static performAlgorithm(
    relayerMapData: EVMRelayerMetaDataType[],
  ): EVMRelayerMetaDataType[] {
    return relayerMapData.sort((a, b) => a.nonce - b.nonce);
  }
}
