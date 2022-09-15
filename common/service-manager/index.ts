/* eslint-disable no-await-in-loop */
// make instance of config and the call setup
// make instance of Mongo
// make instance of Redis Client
// make instance of Redis PubSub
// make instance of Network Manger
// make instance of Gas Price and start updating cache
// make instance of Network Price and start updating cache
// make instance of queue for network id and transaction type - done

import { AAConsumer } from '../../relayer/src/services/consumer/AAConsumer';
import { Config } from '../config';
// import { Mongo } from '../../common/db/mongo/mongo';
import { TransactionType } from '../types';
import { AATransactionQueue } from '../queue/AATransactionQueue';

const queueMap: any = {}; // TODO: Add type of queue
// const dbInstance = Mongo.getInstance();
// const daoUtilsInstance = new DaoUtils(dbInstance);

const supportedNetworks: number[] = [5, 80001];
const transactionType:{ [key: number]: string[] } = {
  5: [TransactionType.AA, TransactionType.SCW],
  80001: [TransactionType.AA, TransactionType.SCW],
};

const configInstance = new Config();
configInstance.setup();
const config = configInstance.get();

(async () => {
  for (const chainId of supportedNetworks) {
    // for each network get transaction type
    for (const type of transactionType[chainId]) {
      if (type === TransactionType.AA) {
        const queue = new AATransactionQueue(chainId, type);
        const aaConsumer = new AAConsumer(chainId, type, queue);
        await queue.connect();
        // start listening for transaction
        await queue.consume(aaConsumer.onMessageReceived);
        queueMap[chainId][type] = queue;
      }
    }
  }
})();

export {
  config,
  queueMap,
};
