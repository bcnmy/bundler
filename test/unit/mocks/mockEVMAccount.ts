import { EVMRawTransactionType } from "../../../common/types";
import { IEVMAccount } from "../../../relayer/src/services/account";

export class MockMFA implements IEVMAccount {
    getPublicKey(): string {
        return "0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c";
    }
    signMessage(message: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    signTransaction(rawTransaction: EVMRawTransactionType): Promise<string> {
        return Promise.resolve("0x43df08a2020aac3acfaeb719d81aa377d0d3e18cadf71c2c529286265c1f2603");
    }

}