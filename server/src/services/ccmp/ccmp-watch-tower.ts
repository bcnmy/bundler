import { Config } from '../../../../config';
import { WatchTower } from '../watch-tower';
import { CCMPMessage, GasFeePaymentArgsStruct } from '../../../../common/types';
import { CCMPTransactionHandler } from './ccmp-transaction-handler';

class CCMPWatchTower implements WatchTower {
  subscribe(indexerURL: string, eventName: string): void {
    throw new Error('Method not implemented.');
  }

  validateEvent(): void {
    throw new Error('Method not implemented.');
  }

  keysToLowerCase(obj: any): any {
    return Object.keys(obj).reduce((acc: any, key) => {
      const newKey = key.charAt(0).toLowerCase() + key.slice(1);
      acc[newKey] = obj[key];
      return acc;
    }, {});
  }

  transformIndexerEvent = (event: Record<string, any>): CCMPMessage => ({
    ...event,
    gasFeePaymentArgs: this.keysToLowerCase(event.gasFeePaymentArgs) as GasFeePaymentArgsStruct,
    payload: event.payload
      .map((payload: any) => this.keysToLowerCase(payload))
      .map((payload: any) => ({
        to: payload.to,
        _calldata: payload.calldata,
      })),
  } as CCMPMessage);

  // TODO: cleanup signature
  processTransaction(
    txHash: string,
    gasUsage: number,
    chainId: number,
    from: string,
    scAddress: string,
    eventName: string,
    eventData: any,
  ): void {
    const configInstance = new Config();
    const config = configInstance.get();
    const rpcUrl = config.chains.provider[chainId];

    const txnHandler = new CCMPTransactionHandler(rpcUrl);
    txnHandler.handleMessage(txHash, gasUsage, this.transformIndexerEvent(eventData));
  }
}

export { CCMPWatchTower };
