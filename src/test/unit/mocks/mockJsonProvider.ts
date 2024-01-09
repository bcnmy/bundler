/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, ethers } from "ethers";

export class MockJsonProvider extends JsonRpcProvider {
  estimateGas(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>,
  ): Promise<BigNumber> {
    return Promise.resolve(BigNumber.from(1));
  }
}
