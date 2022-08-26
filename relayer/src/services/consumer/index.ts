// setup channel for consuming data from queue
// 1-1 mapping with relayer
// consumer(transactionmanager(relayer))

import { Relayer } from '../relayers';

export class Consumer {
  private relayer: Relayer;

  constructor(relayer: Relayer) {
    this.relayer = relayer;
  }
}
