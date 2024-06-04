import { EVMRelayerMetaDataType } from "../../../common/types";

export class SortEVMRelayerByBalance {
  static performAlgorithm(
    relayerMapData: EVMRelayerMetaDataType[],
  ): EVMRelayerMetaDataType[] {
    return relayerMapData.sort((a, b) => (a.balance <= b.balance ? -1 : 1));
  }
}
