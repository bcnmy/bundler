/* eslint-disable import/no-import-module-exports */
import axios from "axios";
import Big from "big.js";
import { decodeEventLog, encodeFunctionData } from "viem";
import {
  ExternalSimulationResponseType,
  SimulateHandleOpsParamsType,
  SimulateHandleOpsReturnType,
  SimulationDataType,
} from "../types";
import { logger } from "../../logger";
import { IGasPrice } from "../../gas-price";
import { GasPriceType } from "../../gas-price/types";
import { IExternalSimulation } from "../interface";
import { customJSONStringify, getTokenPriceKey, parseError } from "../../utils";
import { config } from "../../../config";
import { ICacheService } from "../../cache";
import { EntryPointContractType } from "../../types";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// TODO Remove hard coded values from this class
export class TenderlySimulationService implements IExternalSimulation {
  gasPriceService: IGasPrice;

  cacheService: ICacheService;

  private tenderlyUser: string;

  private tenderlyProject: string;

  private tenderlyAccessKey: string;

  constructor(
    gasPriceService: IGasPrice,
    cacheService: ICacheService,
    options: {
      tenderlyUser: string;
      tenderlyProject: string;
      tenderlyAccessKey: string;
    },
  ) {
    this.gasPriceService = gasPriceService;
    this.cacheService = cacheService;
    this.tenderlyUser = options.tenderlyUser;
    this.tenderlyProject = options.tenderlyProject;
    this.tenderlyAccessKey = options.tenderlyAccessKey;
  }

  async simulate(
    simualtionData: SimulationDataType,
  ): Promise<ExternalSimulationResponseType> {
    const { chainId, data, to, refundInfo } = simualtionData;
    log.info(
      `Sending request to tenderly to run simulation to address: ${to} with data: ${data}`,
    );
    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${this.tenderlyUser}/project/${this.tenderlyProject}/simulate`;
    const tAxios = this.tenderlyInstance();

    const gasPriceForSimulation =
      await this.gasPriceService.getGasPriceForSimulation();
    log.info(`Gas price to be used in simulation: ${gasPriceForSimulation}`);
    const body = {
      // standard TX fields
      network_id: chainId.toString(),
      from: "0xfC614d949CcdC9EC2Ffc2b17eA0824c5A3beC69e",
      input: data,
      gas: 8000000,
      gas_price: gasPriceForSimulation.toString(),
      value: "0",
      to,
      simulation_type: "abi",
      // simulation config (tenderly specific)
      save: true,
    };
    let response;
    try {
      response = await tAxios.post(SIMULATE_URL, body);
    } catch (error) {
      log.error(`Error in Tenderly Simulation: ${customJSONStringify(error)}`);
      return {
        isSimulationSuccessful: false,
        message: `Error in Tenderly Simulation: ${parseError(error)}`,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }
    log.info(
      `Response from Tenderly: ${customJSONStringify(
        response?.data?.transaction,
      )}`,
    );
    if (!response?.data?.transaction?.status) {
      return {
        isSimulationSuccessful: false,
        message: `Response from Tenderly: ${response?.data?.transaction?.error_message}`,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }

    const transactionLogs =
      response.data.transaction.transaction_info.call_trace.logs;
    const gasUsedInSimulation =
      response.data.transaction.transaction_info.call_trace.gas_used +
      response.data.transaction.transaction_info.call_trace.intrinsic_gas;

    if (!refundInfo || Object.keys(refundInfo).length === 0) {
      return {
        isSimulationSuccessful: true,
        message: "Simulation successful",
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }
    const { isSimulationSuccessful, successOrRevertMsg, refundAmountData } =
      await this.checkIfSimulationIsSuccesful(
        transactionLogs,
        gasUsedInSimulation,
        refundInfo,
        to,
        chainId,
        data,
      );

    log.info(
      `isSimulationSuccessful: ${isSimulationSuccessful} for destination address: ${to} with data: ${data}`,
    );

    if (!isSimulationSuccessful) {
      return {
        isSimulationSuccessful: false,
        message: `Payment to relayer is incorrect, with message: ${successOrRevertMsg}`,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }

    const gasLimitFromSimulation = response?.data?.transaction?.gas_used;
    return {
      isSimulationSuccessful: true,
      message: "SimulationSuccesful",
      data: {
        refundAmount: refundAmountData?.refundAmount,
        refundAmountInUSD: refundAmountData?.refundAmountInUSD,
        gasLimitFromSimulation,
      },
    };
  }

  async simulateHandleOps(
    simualteHandleOpsData: SimulateHandleOpsParamsType,
  ): Promise<SimulateHandleOpsReturnType> {
    try {
      const { userOp, entryPointContract, chainId } = simualteHandleOpsData;
      log.info(
        `Sending request to tenderly to run simulation on chainId: ${chainId}`,
      );
      const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${this.tenderlyUser}/project/${this.tenderlyProject}/simulate`;
      const tAxios = this.tenderlyInstance();

      const { publicKey } =
        config.relayerManagers[0].ownerAccountDetails[chainId];
      log.info(
        `Simulating with from address: ${publicKey} on chainId: ${chainId}`,
      );

      const data = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: "handleOps",
        args: [[userOp], publicKey],
      });

      let gas = 9000000;
      if ([43114, 43113].includes(chainId)) {
        gas = 25000000;
      }

      const gasPriceForSimulation =
        await this.gasPriceService.getGasPriceForSimulation();
      log.info(
        `Gas price to be used in simulation: ${gasPriceForSimulation} on chainId: ${chainId}`,
      );
      const body = {
        // standard TX fields
        network_id: chainId.toString(),
        from: "0xc75bb3956c596efc6db663cd3e2f64929d6ab0fc",
        input: data,
        gas,
        gas_price: gasPriceForSimulation.toString(),
        value: "0",
        to: entryPointContract.address,
        simulation_type: "quick",
        // simulation config (tenderly specific)
        save: true,
      };
      let response;
      try {
        const start = performance.now();
        response = await tAxios.post(SIMULATE_URL, body);
        const end = performance.now();
        log.info(`Tenderly simulation call took: ${end - start} milliseconds`);
      } catch (error) {
        log.error(
          `Error in Tenderly Simulation: ${customJSONStringify(error)}`,
        );
        return {
          totalGas: 0,
        };
      }
      if (!response?.data?.transaction?.status) {
        return {
          reason: response?.data?.transaction?.error_message,
          totalGas: 0,
          data,
        };
      }

      const transactionLogs =
        response.data.transaction.transaction_info.call_trace.logs;
      const totalGas = response.data.transaction.gas_used;

      log.info(`totalGas: ${totalGas} from Tenderly simulation`);

      const start = performance.now();
      const { reason, isExecutionSuccess } = this.checkUserOperationExecution(
        transactionLogs,
        entryPointContract,
      );
      const end = performance.now();
      log.info(`checkUserOperationExecution took: ${end - start} milliseconds`);

      return {
        reason,
        totalGas,
        data,
        isExecutionSuccess,
      };
    } catch (error) {
      log.error(`Error in Tenderly handleOps simulation: ${parseError(error)}`);
      return {
        totalGas: 0,
      };
    }
  }

  private tenderlyInstance() {
    return axios.create({
      headers: {
        "X-Access-Key": this.tenderlyAccessKey || "",
        "Content-Type": "application/json",
      },
    });
  }

  getRefundAmountInUsdForNativeToken = async (
    payment: number,
    chainId: number,
  ) => {
    let refundAmountInUsd = new Big(0);
    const networkPriceDataInString =
      await this.cacheService.get(getTokenPriceKey());
    log.info(
      `Getting refund amount in usd for native token with payment value: ${payment} on chainId: ${chainId}`,
    );
    let networkPriceData;
    if (!networkPriceDataInString) {
      log.error("Network price data not found");
      // TODO remove this hardcoded value. Think better solution
      networkPriceData = {
        1: "1278.43",
        5: "1278.43",
        137: "0.80",
        80001: "0.80",
        97: "289.87",
        420: "1278.43",
        421613: "1278.43",
        43113: "13.17",
      };
    } else {
      networkPriceData = JSON.parse(networkPriceDataInString);
    }
    const decimal = config.chains.decimal[chainId] || 18;
    log.info(`Decimal for native token: ${decimal} on chainId: ${chainId}`);
    const chainPriceDataInUSD = networkPriceData[chainId];
    log.info(
      `chainPriceDataInUSD for native token: ${chainPriceDataInUSD} on chainId: ${chainId}`,
    );
    refundAmountInUsd = new Big(payment)
      .div(new Big(10 ** decimal))
      .mul(new Big(chainPriceDataInUSD));
    log.info(
      `refundAmountInUsd for refund in native asset: ${refundAmountInUsd} on chainId: ${chainId}`,
    );
    return refundAmountInUsd;
  };

  static getRefundAmountInUsdForERC20Token = (
    payment: number,
    gasToken: string,
    chainId: number,
  ) => {
    let refundAmountInUsd = new Big(0);
    // NOTE: Adding for DAI, USDC, USDT so dollar price -> $1 for now
    // let token: string = '';
    // const tokensPerChainId = config.feeOption.tokenContractAddress[chainId];
    // for (const currency of Object.keys(tokensPerChainId)) {
    //   if (tokensPerChainId[currency].toLowerCase() === gasToken.toLowerCase()) {
    //     token = currency;
    //   }
    // }
    const decimal = config.chains.decimal[chainId] || 18;
    log.info(`Decimal for erc20 token: ${decimal} on chainId: ${chainId}`);
    // const offset = config.feeOption.offset[chainId][token] || 1;

    refundAmountInUsd = new Big(payment).div(new Big(10 ** decimal));
    log.info(
      `refundAmountInUsd for refund in erc20 token: ${refundAmountInUsd} on chainId: ${chainId}`,
    );
    return refundAmountInUsd;
  };

  private async checkIfSimulationIsSuccesful(
    transactionLogs: any,
    gasUsedInSimulation: number,
    refundInfo: { tokenGasPrice: string; gasToken: string },
    to: string,
    chainId: number,
    data: string,
  ) {
    try {
      log.info(`Refund info received: ${customJSONStringify(refundInfo)}`);
      log.info(
        `gasUsedInSimulation: ${gasUsedInSimulation} for destination address: ${to} with data: ${data}`,
      );
      log.info(
        `Checking if simulation is successful for destination address: ${to} with data: ${data}`,
      );
      const walletHandlePaymentLog = transactionLogs.find(
        (transactionLog: any) => transactionLog.name === "WalletHandlePayment",
      );
      if (!walletHandlePaymentLog) {
        return {
          isSimulationSuccessful: true,
          successOrRevertMsg:
            "WalletHandlePayment event not found in simulation logs",
        };
      }

      const paymentEventData = walletHandlePaymentLog.inputs.find(
        (input: any) => input.soltype.name === "payment",
      );
      if (!paymentEventData) {
        return {
          isSimulationSuccessful: true,
          successOrRevertMsg:
            "Payment data not found in ExecutionSuccess simulation logs",
        };
      }
      const paymentValue = paymentEventData.value;
      if (!paymentValue) {
        return {
          isSimulationSuccessful: true,
          successOrRevertMsg: "Payment value not found in payment event data",
        };
      }
      log.info(
        `Payment sent in transaction: ${paymentValue} for SCW: ${to} with data: ${data}`,
      );

      const gasPriceInString = await this.gasPriceService.getGasPrice(
        GasPriceType.DEFAULT,
      );
      let gasPrice;
      if (typeof gasPriceInString !== "bigint") {
        const { maxFeePerGas } = gasPriceInString;
        gasPrice = maxFeePerGas;
      } else {
        gasPrice = gasPriceInString;
      }
      log.info(`Current gasPrice: ${gasPrice} on chainId: ${chainId}`);

      const nativeTokenGasPrice = parseInt(gasPrice.toString(), 10);

      log.info(
        `Native token gas price: ${nativeTokenGasPrice} for SCW: ${to} with data: ${data}`,
      );
      // ERC 20 token gas price should be in units of native asset
      const erc20TokenGasPrice = parseInt(refundInfo.tokenGasPrice, 10);
      log.info(
        `erc20TokenGasPrice: ${erc20TokenGasPrice} for SCW: ${to} with data: ${data}`,
      );

      let refundToRelayer: number;
      let refundCalculatedInSimualtion: number = 0;
      let refundAmountInUsd: Big;
      if (
        refundInfo.gasToken === "0x0000000000000000000000000000000000000000"
      ) {
        refundToRelayer = Number(paymentValue) * nativeTokenGasPrice;
        refundCalculatedInSimualtion =
          gasUsedInSimulation * nativeTokenGasPrice;
        refundAmountInUsd = await this.getRefundAmountInUsdForNativeToken(
          paymentValue,
          chainId,
        );
      } else {
        // decimals
        // paymentValue is in smallest unit?
        let token: string = "";
        const tokensPerChainId = config.feeOption.tokenContractAddress[chainId];
        for (const currency of Object.keys(tokensPerChainId)) {
          if (
            tokensPerChainId[currency].toLowerCase() ===
            refundInfo.gasToken.toLowerCase()
          ) {
            token = currency;
          }
        }
        // const decimal = config.feeOption.decimals[chainId][token];
        // log.info(`decimal: ${decimal} for SCW: ${to}`);
        refundToRelayer = Number(paymentValue);
        const offset = config.feeOption.offset[chainId][token] || 1;
        log.info(`offset: ${offset} for SCW: ${to}`);
        refundCalculatedInSimualtion =
          (gasUsedInSimulation * erc20TokenGasPrice) / offset;
        refundAmountInUsd =
          TenderlySimulationService.getRefundAmountInUsdForERC20Token(
            paymentValue,
            refundInfo.gasToken,
            chainId,
          );
      }

      log.info(
        `Refund being sent to relayer in the transaction: ${refundToRelayer} for SCW: ${to} with data: ${data}`,
      );
      log.info(
        `Asset consumption calculated from simulation: ${refundCalculatedInSimualtion} for SCW: ${to} with data: ${data}`,
      );

      if (Number(refundToRelayer) < Number(refundCalculatedInSimualtion)) {
        return {
          isSimulationSuccessful: false,
          successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is less than what will be consumed in the transaction: ${
            gasUsedInSimulation * nativeTokenGasPrice
          }`,
        };
      }

      return {
        isSimulationSuccessful: true,
        successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is sufficient to send the transaction`,
        refundAmountData: {
          refundAmount: paymentValue,
          refundAmountInUSD: Number(refundAmountInUsd) as any,
        },
      };
    } catch (error) {
      log.error(parseError(error));
      return {
        isSimulationSuccessful: false,
        successOrRevertMsg: `Something went wrong with error: ${error}`,
      };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private checkUserOperationExecution(
    transactionLogs: Array<any>,
    entryPointContract: EntryPointContractType,
  ) {
    try {
      const userOperationEventLogStart = performance.now();
      const userOperationEventLog = transactionLogs.find(
        (transactionLog: any) =>
          transactionLog.raw.topics[0] ===
          "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f",
      );
      const userOperationEventLogEnd = performance.now();
      log.info(
        `userOperationEventLog fetching took: ${
          userOperationEventLogEnd - userOperationEventLogStart
        } milliseconds`,
      );

      if (!userOperationEventLog) {
        log.error("UserOperationEvent not found in logs");
        return {
          isExecutionSuccess: false,
        };
      }
      log.info(
        `UserOperationEvent found in logs: ${customJSONStringify(
          userOperationEventLog,
        )}`,
      );

      const { topics, data } = userOperationEventLog.raw;

      const parseLogStart = performance.now();
      const logDescription = decodeEventLog({
        abi: entryPointContract.abi,
        topics,
        data,
      });
      const parseLogEnd = performance.now();
      log.info(`parseLog took: ${parseLogEnd - parseLogStart} milliseconds`);

      if (logDescription.eventName !== "UserOperationEvent") {
        log.error("UserOperationEvent not found in logs");
        return {
          isExecutionSuccess: false,
        };
      }
      const { success } = logDescription.args;
      if (!success) {
        return {
          reason: "userOp execution failed",
          isExecutionSuccess: false,
        };
      }
      return {
        isExecutionSuccess: true,
      };
    } catch (error) {
      log.error(
        `Error in parsing handleOps logs with error: ${parseError(error)}`,
      );
      return {
        actualGasUsed: 0,
      };
    }
  }
}
