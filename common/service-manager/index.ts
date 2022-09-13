/* eslint-disable no-await-in-loop */
// make instance of config and the call setup
// make instance of Mongo
// make instance of Redis Client
// make instance of Redis PubSub
// make instance of Network Manger
// make instance of Gas Price and start updating cache
// make instance of Network Price and start updating cache
// make instance of queue for network id and transaction type - done

import { AAConsumer } from '../../relayer/src/services/consumer/aa-consumer';
// import { Mongo } from '../db/mongo';
import { TransactionType } from '../interface';
import { AATransactionsQueue } from '../queue/aa-transaction-queue';

const queueMap: any = {}; // TODO: Add type of queue
// const dbInstance = Mongo.getInstance();
// const daoUtilsInstance = new DaoUtils(dbInstance);

const supportedNetworks: number[] = [5, 80001];
const transactionType:{ [key: number]: string[] } = {
  5: [TransactionType.AA, TransactionType.SCW],
  80001: [TransactionType.AA, TransactionType.SCW],
};
(async () => {
  for (const chainId of supportedNetworks) {
    // for each network get transaction type
    for (const type of transactionType[chainId]) {
      if (type === TransactionType.AA) {
        const aaConsumer = new AAConsumer(chainId, type); // do we require consumer map ?
        const queue = new AATransactionsQueue(chainId, type, aaConsumer.onMessageReceived);
        await queue.connect();
        await queue.consume(); // consumer starts listening
        queueMap[chainId][type] = queue; // do we require queue map ?
      }
    }
  }
})();

export {
  queueMap,
};
