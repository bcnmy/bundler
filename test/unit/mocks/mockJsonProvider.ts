import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, ethers } from "ethers";

export class MockJsonProvider extends JsonRpcProvider {
    estimateGas(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<BigNumber> {
        return Promise.resolve(BigNumber.from(1));
    }
}