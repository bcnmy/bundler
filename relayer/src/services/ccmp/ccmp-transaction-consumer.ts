import { relayerManagerMap } from "../../service-manager";
import { Relayer } from "../relayers";
import { RelayerManager } from "../relayers-manager";
import { TransactionConsumer } from "../transaction-consumer";

class CCMPTransactionConsumer implements TransactionConsumer {
    onTransactionEnqueued(): void {
        throw new Error("Method not implemented.");
    }

    // TODO: add this to 
    relayNextTransaction(chainId: number): void {
        const relayerManager: RelayerManager = relayerManagerMap[chainId];

        const relayer: Relayer = relayerManager.getNextRelayer();
        relayer.startConsumptionFromQueue()
            .then(response => {
                console.log(response);
                /** TODO:
                 * update in db
                 * notify ccmp-sdk when complete
                 */
            })
            .catch(err => {
                console.error(err);
                // TODO: retyr transaction
            });
    }

}

export { CCMPTransactionConsumer };
