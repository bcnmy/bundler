/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import {
  decodeErrorResult,
  encodeFunctionData,
  toHex,
  zeroAddress,
} from "viem";
import { config } from "../../config";
import { IEVMAccount } from "../../relayer/account";

import { logger } from "../logger";
import { INetworkService } from "../network";
import {
  EntryPointV07ContractType,
  EVMRawTransactionType,
  UserOperationType,
} from "../types";
import { customJSONStringify, parseError } from "../utils";
import RpcError from "../utils/rpc-error";
import {
  EstimateUserOperationGasDataTypeV07,
  EstimateUserOperationGasReturnTypeV07,
  SimulationDataV07,
  ValidationDataV07,
} from "./types";
import { IGasPriceService } from "../gas-price";
import { ENTRY_POINT_V07_ABI } from "../entrypoint-v7/abiv7";
import {
  getUserOpHash,
  packUserOperation,
} from "../entrypoint-v7/PackedUserOperation";
import nodeconfig from "config";
import { CallTracerResult, findErrorsInTrace } from "./trace";
import {
  GasEstimator,
  createGasEstimator,
  isEstimateUserOperationGasResultV7,
  EstimateUserOperationGasResult,
  toPackedUserOperation,
  bumpBigIntPercent,
} from "@biconomy/gas-estimations";
import { STATUSES } from "../../server/api/shared/statuses";
import { BUNDLER_ERROR_CODES } from "../../server/api/shared/errors/codes";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// TODO: We probably don't need a separate file for this, but I'm keeping it for now as a reference
export class BundlerSimulationServiceV07 {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  gasPriceService: IGasPriceService;

  gasEstimator: GasEstimator;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    gasPriceService: IGasPriceService,
  ) {
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.gasEstimator = createGasEstimator({
      chainId: networkService.chainId,
      rpc: config.chains.providers[networkService.chainId][0].url,
    });
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataTypeV07,
  ): Promise<EstimateUserOperationGasReturnTypeV07> {
    try {
      const { userOp, entryPointContract, chainId, stateOverrideSet } =
        estimateUserOperationGasData;

      const start = performance.now();
      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      const gasPrice = await this.gasPriceService.getGasPrice();
      if (typeof gasPrice === "bigint") {
        userOp.maxFeePerGas = gasPrice;
        userOp.maxPriorityFeePerGas = gasPrice;
      } else {
        const { maxFeePerGas } = gasPrice;
        userOp.maxFeePerGas = maxFeePerGas;
        userOp.maxPriorityFeePerGas = maxFeePerGas;
      }

      // for userOp completeness
      userOp.callGasLimit = BigInt(5000000);
      userOp.verificationGasLimit = BigInt(5000000);
      userOp.preVerificationGas = BigInt(5000000);

      userOp.factory = userOp.factory ?? "0x";
      userOp.factoryData = userOp.factoryData ?? "0x";

      log.info(
        `userOp to be used for estimation: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();

      let response: EstimateUserOperationGasResult;
      try {
        response = await this.gasEstimator.estimateUserOperationGas({
          unEstimatedUserOperation: userOp,
          baseFeePerGas,
          stateOverrides: stateOverrideSet,
          options: {
            entryPointAddress: entryPointContract.address,
            useBinarySearch: false
          },
        });
      } catch (error: any) {
        let errorMessage: string = error.message;

        log.error(
          { chainId },
          `[@biconomy/gas-estimations] package threw an error: ${errorMessage}`,
        );
        throw errorMessage;
      }

      if (!isEstimateUserOperationGasResultV7(response)) {
        throw new Error(
          "Invalid response from the gas estimator. Expected a V7 response.",
        );
      }

      let {
        verificationGasLimit,
        callGasLimit,
        preVerificationGas,
        paymasterPostOpGasLimit,
        paymasterVerificationGasLimit,
      } = response;

      log.info(
        { chainId },
        `estimateUserOperationGas: ${customJSONStringify(response)}`,
      );

      callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.1));
      verificationGasLimit = bumpBigIntPercent(verificationGasLimit, 20);
      paymasterPostOpGasLimit += BigInt(
        Math.ceil(Number(paymasterPostOpGasLimit) * 0.1),
      );
      paymasterVerificationGasLimit += BigInt(
        Math.ceil(Number(paymasterVerificationGasLimit) * 0.1),
      );

      const requiredGas =
        verificationGasLimit +
        callGasLimit +
        preVerificationGas +
        paymasterVerificationGasLimit +
        paymasterPostOpGasLimit;

      log.info({ chainId }, `requiredGas: ${requiredGas}`);

      const pvgMarkUp = config.pvgMarkUp[chainId] || 0.1; // setting default pvgMarkUp to 10% incase the value for a given chainId is not set

      preVerificationGas += BigInt(
        Math.ceil(Number(toHex(requiredGas)) * pvgMarkUp),
      );

      log.info(
        `preVerificationGas after bumping it up: ${preVerificationGas} on chainId: ${chainId}`,
      );

      const end = performance.now();
      log.info(`Estimating the userOp took: ${end - start} milliseconds`);

      const data = {
        preVerificationGas,
        verificationGasLimit,
        callGasLimit,
        paymasterPostOpGasLimit,
        paymasterVerificationGasLimit,
      };
      log.info(
        `estimateUserOperationGas result: ${customJSONStringify(data)}`,
        { chainId },
      );

      return {
        code: STATUSES.SUCCESS,
        message: `Gas successfully estimated for userOp: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
        data,
      };
    } catch (error: any) {
      log.error(
        `Error in estimating user op: ${parseError(error)} on chainId: ${estimateUserOperationGasData.chainId}`,
      );
      return {
        code: error.code,
        message: parseError(error),
        data: {
          preVerificationGas: BigInt(0),
          verificationGasLimit: BigInt(0),
          callGasLimit: BigInt(0),
          paymasterPostOpGasLimit: BigInt(0),
          paymasterVerificationGasLimit: BigInt(0),
        },
      };
    }
  }

  async simulateValidation(simulateValidationData: SimulationDataV07) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = simulateValidationData;

      // for userOp completeness
      userOp.factory = userOp.factory ?? "0x";
      userOp.factoryData = userOp.factoryData ?? "0x";

      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      const { maxPriorityFeePerGas, maxFeePerGas } =
        await this.gasPriceService.get1559GasPrice();
      let gasPrice = Math.ceil(Number(maxFeePerGas) * 2).toString(16);

      await this.checkUserOperationForRejection(
        {
          userOp,
          networkMaxPriorityFeePerGas: maxPriorityFeePerGas,
          networkMaxFeePerGas: maxFeePerGas,
        },
        entryPointContract,
      );

      const packed = packUserOperation(userOp);
      const data = encodeFunctionData({
        abi: ENTRY_POINT_V07_ABI,
        functionName: "handleOps",
        args: [[packed], userOp.sender],
      });

      const { ownerAddress } = config.relayerManagers[0];
      log.info(
        `Simulating with from address: ${ownerAddress} on chainId: ${chainId}`,
      );

      const ethEstimateGasParams = [
        {
          from: ownerAddress,
          to: entryPointContract.address,
          data,
          gasPrice: `0x${gasPrice}`,
        },
      ];

      log.info(
        `ethEstimateGasParams: ${customJSONStringify(
          ethEstimateGasParams,
        )} on chainId: ${chainId}`,
      );

      const ethEstimateGasStart = performance.now();

      const ethEstimateGasResponse =
        await this.networkService.estimateGas(ethEstimateGasParams);
      const ethEstimateGasEnd = performance.now();
      log.info(
        `eth_estimateGas took: ${
          ethEstimateGasEnd - ethEstimateGasStart
        } milliseconds`,
      );

      log.info(
        `Response from eth_estimateGas: ${customJSONStringify(
          ethEstimateGasResponse,
        )} on chainId: ${chainId}`,
      );

      const ethEstimateGasError = ethEstimateGasResponse.error;
      let totalGas = 0;

      if (
        ethEstimateGasError &&
        Object.keys(ethEstimateGasError).length > 0 &&
        ethEstimateGasError.data
      ) {
        const errorDescription = decodeErrorResult({
          abi: entryPointContract.abi,
          data: ethEstimateGasError.data,
        });

        if (errorDescription.errorName === "FailedOp") {
          const { args } = errorDescription;

          const reason = args[1];
          log.info(
            `Transaction failed with reason: ${reason} on chainId: ${chainId}`,
          );
          if (reason.includes("AA1") || reason.includes("AA2")) {
            log.info(`error in account on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_ERROR_CODES.SIMULATE_VALIDATION_FAILED,
            );
          } else if (reason.includes("AA3")) {
            log.info(`error in paymaster on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_ERROR_CODES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
            );
          } else if (reason.includes("AA9")) {
            log.info(`error in inner handle op on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED,
            );
          } else if (reason.includes("AA4")) {
            log.info("error in verificationGasLimit being incorrect");
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_ERROR_CODES.SIMULATE_VALIDATION_FAILED,
            );
          }
          const message = this.removeSpecialCharacters(reason);
          throw new RpcError(
            message,
            BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED,
          );
        } else {
          const { args } = errorDescription;

          const reason = args[1]
            ? args[1].toString()
            : errorDescription.errorName;
          const message = this.removeSpecialCharacters(reason);
          throw new RpcError(
            message,
            BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED,
          );
        }
      } else if (typeof ethEstimateGasResponse === "string") {
        totalGas = Number(ethEstimateGasResponse);
      } else {
        return {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: `Error in estimating handleOps gas: ${parseError(
            ethEstimateGasResponse.error.message,
          )}`,
          data: {
            totalGas: 0,
            userOpHash: null,
            handleOpsCallData,
          },
        };
      }

      const start = performance.now();
      let packedUserOp = packUserOperation(userOp);
      const userOpHash = getUserOpHash(
        packedUserOp,
        entryPointContract.address,
        BigInt(chainId),
      );
      log.info(`userOpHash: ${userOpHash} on chainId: ${chainId}`);
      const end = performance.now();
      log.info(`Getting userOpHash took ${end - start} milliseconds`);

      return {
        code: STATUSES.SUCCESS,
        message: "userOp Validated",
        data: {
          totalGas,
          userOpHash,
          handleOpsCallData: null,
        },
      };
    } catch (error: any) {
      log.error(
        `Error in simulateValidation: ${parseError(error)} on chainId: ${simulateValidationData.chainId}`,
      );
      return {
        code: error.code,
        message: parseError(error),
        data: {
          totalGas: 0,
          userOpHash: null,
          handleOpsCallData,
        },
      };
    }
  }

  /**
   * Check if the user operation is valid for the network
   * @param validationData
   * @returns true if the user operation is valid
   */
  async checkUserOperationForRejection(
    validationData: ValidationDataV07,
    entryPointContract: EntryPointV07ContractType,
  ): Promise<boolean> {
    // TODO: Check if balance >= required prefund if wallet deployment because we can't simulate deployment tx's

    const { userOp, networkMaxFeePerGas, networkMaxPriorityFeePerGas } =
      validationData;

    const { maxPriorityFeePerGas, maxFeePerGas, preVerificationGas } = userOp;

    const {
      maxPriorityFeePerGasThresholdPercentage,
      maxFeePerGasThresholdPercentage,
      preVerificationGasThresholdPercentage,
    } = config;

    log.info(
      `maxPriorityFeePerGasThresholdPercentage: ${maxPriorityFeePerGasThresholdPercentage}
       maxFeePerGasThresholdPercentage: ${maxFeePerGasThresholdPercentage}
       preVerificationGasThresholdPercentage: ${preVerificationGasThresholdPercentage}`,
    );

    const minimumAcceptableMaxPriorityFeePerGas =
      Number(networkMaxPriorityFeePerGas) *
      maxPriorityFeePerGasThresholdPercentage;
    const minimumAcceptableMaxFeePerGas =
      Number(networkMaxFeePerGas) * maxFeePerGasThresholdPercentage;

    log.info(
      `minimumAcceptableMaxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas} minimumAcceptableMaxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
    );
    log.info(`Checking if maxPriorityFeePerGas is within acceptable limits`);

    if (minimumAcceptableMaxPriorityFeePerGas > Number(maxPriorityFeePerGas)) {
      log.info(
        `maxPriorityFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas}`,
      );
      throw new RpcError(
        `maxPriorityFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas}`,
        BUNDLER_ERROR_CODES.MAX_PRIORITY_FEE_PER_GAS_TOO_LOW,
      );
    }
    log.info(`maxPriorityFeePerGas is within acceptable limits`);
    log.info(`Checking if maxFeePerGas is within acceptable limits`);

    if (minimumAcceptableMaxFeePerGas > Number(maxFeePerGas)) {
      log.info(
        `maxFeePerGas in userOp: ${maxFeePerGas} is lower than expected maxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
      );
      throw new RpcError(
        `maxFeePerGas in userOp: ${maxFeePerGas} is lower than expected maxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
        BUNDLER_ERROR_CODES.MAX_FEE_PER_GAS_TOO_LOW,
      );
    }
    log.info(`maxFeePerGas is within acceptable limits`);
    log.info(`Checking if preVerificationGas is within acceptable limits`);

    const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();

    const networkPreVerificationGas =
      await this.gasEstimator.estimatePreVerificationGas(
        userOp,
        BigInt(baseFeePerGas),
      );
    log.info(`networkPreVerificationGas: ${networkPreVerificationGas}`);

    const minimumAcceptablePreVerificationGas =
      Number(networkPreVerificationGas) * preVerificationGasThresholdPercentage;

    if (minimumAcceptablePreVerificationGas > Number(preVerificationGas)) {
      log.info(
        `preVerificationGas in userOp: ${Number(preVerificationGas)} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
      );
      throw new RpcError(
        `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
        BUNDLER_ERROR_CODES.PRE_VERIFICATION_GAS_TOO_LOW,
      );
    }

    // Check the user operation for validation and execution errors (if debug_traceCall is supported)
    if (
      // we can't simulate deployment transactions, they will fail because of insufficient entrypoint deposit
      userOp.factory === "0x" &&
      userOp.factoryData === "0x" &&
      nodeconfig.has("supportsDebugTraceCall") &&
      nodeconfig
        .get<number[]>("supportsDebugTraceCall")
        .includes(this.networkService.chainId)
    ) {
      const traceStart = performance.now();

      const packedUserOperation = toPackedUserOperation(userOp);

      log.info(
        { chainId: this.networkService.chainId },
        `packedUserOperation: ${customJSONStringify(packedUserOperation)}`,
      );
      const traceResult: CallTracerResult =
        await this.networkService.provider.request({
          method: "debug_traceCall" as any, // coalesce so viem doesn't complain
          params: [
            {
              from: zeroAddress, // so we don't get balance errors
              to: entryPointContract.address,
              data: encodeFunctionData({
                abi: entryPointContract.abi,
                functionName: "handleOps",
                args: [
                  [packedUserOperation],
                  "0xc75Bb3956c596efc6DB663cd3e2f64929d6AB0fc",
                ],
              }),
            },
            "latest",
            {
              tracer: "callTracer",
              tracerConfig: {
                onlyTopCall: false, // we need deep traces
                disableStack: false, // and we want the stack
                enableReturnData: true, // and the return data so we can decode the error
              },
            },
          ],
        });
      const traceEnd = performance.now();

      log.info(`debug_traceCall took ${traceEnd - traceStart} milliseconds`);

      const errors = findErrorsInTrace(traceResult, []);

      if (errors.length > 0) {
        log.info(`Errors found in trace: ${customJSONStringify(errors)}`);
        log.info(customJSONStringify(traceResult));
        throw new Error(errors.join(", "));
      }
    }

    log.info(
      `maxFeePerGas, maxPriorityFeePerGas and preVerification are within acceptable limits`,
    );
    return true;
  }

  removeSpecialCharacters(input: string): string {
    const match = input.match(/AA(\d+)\s(.+)/);

    if (match) {
      const errorCode = match[1]; // e.g., "25"
      const errorMessage = match[2]; // e.g., "invalid account nonce"
      const newMatch = `AA${errorCode} ${errorMessage}`.match(
        // eslint-disable-next-line no-control-regex
        /AA.*?(?=\\u|\u0000)/,
      );
      if (newMatch) {
        const extractedString = newMatch[0];
        return extractedString;
      }
      return `AA${errorCode} ${errorMessage}`;
    }
    return input;
  }

  static parseSimulateHandleOpResult(
    userOp: UserOperationType,
    simulateHandleOpResult: any,
  ) {
    if (!simulateHandleOpResult?.errorName?.startsWith("ExecutionResult")) {
      log.info(
        `Inside ${!simulateHandleOpResult?.errorName?.startsWith(
          "ExecutionResult",
        )}`,
      );
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      log.info(
        `simulateHandleOpResult.errorArgs: ${simulateHandleOpResult.errorArgs}`,
      );
      if (!simulateHandleOpResult.errorArgs) {
        throw new RpcError(
          `Error: ${customJSONStringify(simulateHandleOpResult)}`,
          BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED,
        );
      }
      let { paymaster } = simulateHandleOpResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }

      const msg: string =
        simulateHandleOpResult.errorArgs?.reason ??
        simulateHandleOpResult.toString();

      if (paymaster == null) {
        log.info(
          `account validation failed: ${msg} for userOp: ${customJSONStringify(
            userOp,
          )}`,
        );
        throw new RpcError(msg, BUNDLER_ERROR_CODES.SIMULATE_VALIDATION_FAILED);
      } else {
        log.info(
          `paymaster validation failed: ${msg} for userOp: ${customJSONStringify(
            userOp,
          )}`,
        );
        throw new RpcError(
          msg,
          BUNDLER_ERROR_CODES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
        );
      }
    }

    const preOpGas = simulateHandleOpResult.errorArgs[0];
    log.info(`preOpGas: ${preOpGas}`);
    const paid = simulateHandleOpResult.errorArgs[1];
    log.info(`paid: ${paid}`);
    const validAfter = simulateHandleOpResult.errorArgs[2];
    log.info(`validAfter: ${validAfter}`);
    const validUntil = simulateHandleOpResult.errorArgs[3];
    log.info(`validUntil: ${validUntil}`);
    const targetSuccess = simulateHandleOpResult.errorArgs[4];
    log.info(`targetSuccess: ${targetSuccess}`);
    const targetResult = simulateHandleOpResult.errorArgs[5];
    log.info(`targetResult: ${targetResult}`);

    return {
      preOpGas,
      paid,
      validAfter,
      validUntil,
      targetSuccess,
      targetResult,
    };
  }
}
