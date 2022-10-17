import { PriorityQueue } from "../../priority-queue";
import { Relayer } from "../relayers";

class RelayerPriorityQueue implements PriorityQueue<Relayer> {

    constructor() {
        /* initialize heap */
    }

    /** TODO: the priority should be derived from the Relayer using `activeStatus`,
     * `delta(balance, checkBalanceBelowThreshold())` and `delta(pendingTransactionCount, pendingTransactionCountThreshold)`
     */
    insert(relayer: Relayer): void {
        const balanceDiff = relayer.balance;
        const transactionCount = relayer.pendingTransactionCountThreshold;
        const status = relayer.activeStatus;
    }

    peek(): Relayer {
        throw new Error("Method not implemented.");
    }

    pop(): Relayer {
        throw new Error("Method not implemented.");
    }

    size(): number {
        throw new Error("Method not implemented.");
    }

    isEmpty(): boolean {
        throw new Error("Method not implemented.");
    }

}

export { RelayerPriorityQueue };
