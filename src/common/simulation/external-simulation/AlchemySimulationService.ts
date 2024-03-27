/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-continue */
import { decodeErrorResult, encodeFunctionData } from "viem";
import { EVMAccount } from "../../../relayer/account";
import { INetworkService } from "../../network";
import { EVMRawTransactionType } from "../../types";
import { SimulateHandleOpsParamsType } from "../types";
import { logger } from "../../logger";
import { config } from "../../../config";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class AlchemySimulationService {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  constructor(
    networkSerivce: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkSerivce;
  }

  async simulateHandleOps(simualteHandleOpsData: SimulateHandleOpsParamsType) {
    const { userOp, entryPointContract, chainId } = simualteHandleOpsData;

    const { ownerAddress } = config.relayerManagers[0];
    log.info(
      `Simulating with from address: ${ownerAddress} on chainId: ${chainId}`,
    );

    const data = encodeFunctionData({
      abi: entryPointContract.abi,
      functionName: "handleOps",
      args: [[userOp], ownerAddress],
    });

    const simulateExecutionStart = performance.now();
    const { calls, logs } = await this.networkService.runAlchemySimulation([
      {
        from: ownerAddress,
        to: entryPointContract.address,
        value: "0x0",
        data,
      },
    ]);
    const simulateExecutionEnd = performance.now();
    log.info(
      `Network call to alchemy_simulateExecution took: ${
        simulateExecutionEnd - simulateExecutionStart
      } milliseconds`,
    );
    let totalGas;

    if (logs.length !== 0) {
      const start = performance.now();
      const userOperationEvent = logs.find(
        (events: any) => events.decoded.eventName === "UserOperationEvent",
      );
      if (!userOperationEvent) {
        log.info(
          "UserOperationEvent not found, checking simulation calls for transaction revert reason",
        );
        const transactionCall = calls.find(
          (call: any) => call.error === "execution reverted",
        );
        const error = decodeErrorResult({
          abi: entryPointContract.abi,
          data: transactionCall.output,
        });
        const { args } = error;
        const end = performance.now();
        log.info(
          `Checking transaction execution revert took: ${
            end - start
          } milliseconds`,
        );
        return {
          reason: args[0],
          totalGas: 0,
          data,
        };
      }
      const successData = userOperationEvent.decoded.inputs[4];
      if (successData.value !== "true") {
        return {
          reason: "userOp execution failed",
          totalGas: 0,
          data,
        };
      }
      const end = performance.now();
      log.info(`Checking userOp execution took: ${end - start} milliseconds`);

      const totalGasStart = performance.now();
      totalGas = calls.reduce(
        (total: any, call: any) => total + Number(call.gasUsed),
        0,
      );
      const totalGasEnd = performance.now();
      log.info(
        `Calculating total gas took: ${
          totalGasEnd - totalGasStart
        } milliseconds`,
      );
    } else {
      const start = performance.now();
      const transactionCall = calls.find(
        (call: any) => call.error === "execution reverted",
      );
      const errorDescription = decodeErrorResult({
        abi: entryPointContract.abi,
        data: transactionCall.output,
      });
      const { args } = errorDescription;
      const end = performance.now();
      log.info(
        `Checking transaction execution revert took: ${
          end - start
        } milliseconds`,
      );
      return {
        reason: args[0],
        totalGas: 0,
        data,
      };
    }

    return {
      totalGas,
    };
  }
}
