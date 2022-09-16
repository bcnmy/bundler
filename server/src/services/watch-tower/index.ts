import { CCMPMessage } from "../../../../types/ccmp"

/**
 * @interface WatchTower // TODO: ...
 */
interface WatchTower {
    subscribe(indexerURL: string, eventName: string): void
    validateEvent(): void
    processTransaction(txHash: string, gasUsage: number, chainId: number, from: string, scAddress: string, eventName: string, eventData: CCMPMessage): void
};

export { WatchTower };
