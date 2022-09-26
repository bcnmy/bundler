import { IStrategy } from '../interface/IStrategy';
import { EVMRelayerMetaDataType } from '../types';

export class SortRelayerByLeastPendingCount implements IStrategy<EVMRelayerMetaDataType> {
  // eslint-disable-next-line class-methods-use-this
  public doAlgorithm(data: EVMRelayerMetaDataType[]): EVMRelayerMetaDataType[] {
    return data.sort((d) => d.address.length);
  }
}
