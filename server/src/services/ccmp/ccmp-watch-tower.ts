import { config } from "../../../config";
import { WatchTower } from "../watch-tower";
import { CCMPMessage } from "../../../../types/ccmp"
import { CCMPTransactionHandler } from "./ccmp-transaction-handler";

class CCMPWatchTower implements WatchTower {

    subscribe(indexerURL: string, eventName: string): void {
        throw new Error("Method not implemented.")
    }

    validateEvent(): void {
        throw new Error("Method not implemented.")
    }

    // TODO: cleanup signature
    processTransaction(txHash: string, gasUsage: number, chainId: number, from: string, scAddress: string, eventName: string, eventData: CCMPMessage): void {
        // TODO: perform event validation here
        // ...

        // TODO: save data to db

        console.log("processing trnsaction in ccmp watch tower")
        // const {
        //     sender,
        //     sourceGateway,
        //     sourceAdaptor,
        //     sourceChainId,
        //     destinationGateway,
        //     destinationChainId,
        //     nonce,
        //     routerAdaptor,
        //     payload
        // } = eventData;

        const txnHandler = new CCMPTransactionHandler(config.provider[chainId]);
        txnHandler.handleMessage(txHash, gasUsage, eventData);
    }

}

export { CCMPWatchTower };
