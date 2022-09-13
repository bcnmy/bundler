// make instance of config and the call setup
// make instance of Mongo
// make instance of Redis Client
// make instance of Redis PubSub
// make instance of Network Manger
// make instance of Gas Price and start updating cache
// make instance of Network Price and start updating cache
// make instance of queue for network id and transaction type - done

import { TransactionType } from '../../relayer/src/common/types';
import { Mongo } from '../db/mongo/models/blockchain_transactions/mongo';
import { Queue } from '../queue/aa-transaction-queue';

const queueMap: any = {}; // TODO: Add type of queue
const dbInstance = Mongo.getInstance();
// const daoUtilsInstance = new DaoUtils(dbInstance);

const supportedNetworks: number[] = [5, 80001];
const transactionType:{ [key: number]: string[] } = {
  5: [TransactionType.AA, TransactionType.SCW],
  80001: [TransactionType.AA, TransactionType.SCW],
};
for (const chainId of supportedNetworks) {
  // for each network get transaction type
  for (const type of transactionType[chainId]) {
    const queue = new Queue(chainId, type);
    queueMap[chainId][type] = queue;
  }
}

export {
  queueMap,
}
