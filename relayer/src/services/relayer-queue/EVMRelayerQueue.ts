import { Mutex } from 'async-mutex';
import { IRelayerQueue } from './interface/IRelayerQueue';
import { SortEVMRelayerByBalance } from './strategy';
import { EVMRelayerMetaDataType } from './types';

const popMutex = new Mutex();
const pushMutex = new Mutex();

export class EVMRelayerQueue implements IRelayerQueue<EVMRelayerMetaDataType> {
  items: Array<EVMRelayerMetaDataType>;

  constructor(items: Array<EVMRelayerMetaDataType>) {
    this.items = items;
  }

  size(): number {
    return this.items.length;
  }

  list(): Array<EVMRelayerMetaDataType> {
    return this.items;
  }

  async pop(): Promise<EVMRelayerMetaDataType | undefined> {
    return popMutex.runExclusive(() => this.items.shift());
  }

  async push(item: EVMRelayerMetaDataType): Promise<void> {
    return pushMutex.runExclusive(() => {
      this.items.push(item);
      this.items = SortEVMRelayerByBalance.performAlgorithm(
        this.items,
      );
    });
  }
}
