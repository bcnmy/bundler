/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import {
  decodeErrorResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbiParameters,
  toHex,
  zeroAddress,
} from "viem";
import nodeconfig from "config";
import { config } from "../../config";
import { IEVMAccount } from "../../relayer/account";
import {
  BUNDLER_ERROR_CODES,
  STATUSES,
} from "../../server/api/shared/middleware";
import { logger } from "../logger";
import { INetworkService } from "../network";
import {
  EntryPointContractType,
  EVMRawTransactionType,
  UserOperationType,
} from "../types";
import {
  customJSONStringify,
  packUserOpForUserOpHash,
  parseError,
} from "../utils";
import RpcError from "../utils/rpc-error";
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  SimulationData,
  ValidationData,
} from "./types";
import { BLOCKCHAINS } from "../constants";
import { IGasPriceService } from "../gas-price";
import { UserOperationV6 } from "@biconomy/gas-estimations";
import { GasEstimator } from "@biconomy/gas-estimations";
import { createGasEstimator } from "@biconomy/gas-estimations";
import { isEstimateUserOperationGasResultV6 } from "@biconomy/gas-estimations";
import { CallTracerResult, findErrorsInTrace } from "./trace";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * Options for the BundlerSimulationService constructor
 * @member {SimulationNetworkService} networkService - The network service that will be used to call `eth_estimateGas`
 * @member {IGasPriceService} gasPriceService - The gas price service used to fetch both legacy and EIP-1559 gas prices
 * @member {SimulationGasEstimator} gasEstimator - The estimator used for eth_estimateUserOperationGas.
 * You can pass your own gas estimator or the default one will be used
 */
interface IBundlerSimulationServiceOptions {
  networkService: SimulationNetworkService;
  gasPriceService: IGasPriceService;
  gasEstimator?: SimulationGasEstimator;
}

/**
 * BundlerSimulationService is responsible for estimating the gas limits & values for user operations
 * and validating the user operation before sending it to the network.
 */
export class BundlerSimulationService {
  networkService: SimulationNetworkService;

  gasPriceService: IGasPriceService;

  gasEstimator: SimulationGasEstimator;

  constructor({
    networkService,
    gasPriceService,
    gasEstimator = createGasEstimator({
      chainId: networkService.chainId,
      rpc: config.chains.providers[networkService.chainId][0].url,
    }),
  }: IBundlerSimulationServiceOptions) {
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.gasEstimator = gasEstimator;
  }

  /**
   * Used for pretty printing the service configuration
   * @returns JSON stringified object with API keys removed
   */
  toJSON(): Omit<
    IBundlerSimulationServiceOptions,
    "gasPriceService" | "newGasEstimator"
  > {
    return {
      networkService: this.networkService,
      gasEstimator: this.gasEstimator,
    };
  }

  // TODO: Add option to pass an entrypoint address to the new gas estimator
  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const { userOp, entryPointContract, chainId, stateOverrideSet } =
        estimateUserOperationGasData;

      const start = performance.now();
      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      // for userOp completeness
      if (!userOp.paymasterAndData) {
        userOp.paymasterAndData = "0x";
      }

      // for userOp completeness
      if (!userOp.signature) {
        // signature not present, using default ECDSA
        userOp.signature =
          "0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b";
      }

      const gasPrice = await this.gasPriceService.getGasPrice();
      if (typeof gasPrice === "bigint") {
        userOp.maxFeePerGas = gasPrice;
        userOp.maxPriorityFeePerGas = gasPrice;
      } else {
        const { maxFeePerGas } = gasPrice;
        userOp.maxFeePerGas = maxFeePerGas;
        userOp.maxPriorityFeePerGas = maxFeePerGas;
      }

      log.info(
        `userOp to be used for estimation: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      let baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
      if (chainId === BLOCKCHAINS.OP_BNB_MAINNET && baseFeePerGas === 0n) {
        baseFeePerGas = BigInt(
          config.gasOverrides[BLOCKCHAINS.OP_BNB_MAINNET].baseFeePerGas,
        );
      }

      const response = await this.gasEstimator.estimateUserOperationGas({
        unEstimatedUserOperation: userOp,
        baseFeePerGas,
        stateOverrides: stateOverrideSet,
        options: {
          entryPointAddress: entryPointContract.address,
        },
      });

      log.info(
        { chainId },
        `estimateUserOperationGas: ${customJSONStringify(response)}`,
      );

      if (!isEstimateUserOperationGasResultV6(response)) {
        throw new Error(
          "Invalid response from the gas estimator. Expected a V6 response.",
        );
      }

      const { validAfter, validUntil } = response;
      let { verificationGasLimit, callGasLimit, preVerificationGas } = response;

      if (
        config.networksNotSupportingEthCallStateOverrides.includes(chainId) ||
        config.networksNotSupportingEthCallBytecodeStateOverrides.includes(
          chainId,
        )
      ) {
        callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.2));
        verificationGasLimit += BigInt(
          Math.ceil(Number(verificationGasLimit) * 0.2),
        );
        if (
          chainId === BLOCKCHAINS.CHILIZ_MAINNET ||
          chainId === BLOCKCHAINS.CHILIZ_TESTNET
        ) {
          verificationGasLimit += BigInt(
            Math.ceil(Number(verificationGasLimit) * 0.2),
          );
        }
      } else {
        callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.1));
        verificationGasLimit += BigInt(
          Math.ceil(Number(verificationGasLimit) * 0.1),
        );
      }

      if (chainId === BLOCKCHAINS.BLAST_MAINNET) {
        callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.5));
      }

      if (chainId === BLOCKCHAINS.MANTLE_MAINNET) {
        preVerificationGas += preVerificationGas;
      }

      const verificationGasLimitMultiplier =
        userOp.paymasterAndData === "0x" ? 1 : 3;
      const totalGas =
        callGasLimit +
        BigInt(verificationGasLimitMultiplier) * verificationGasLimit +
        preVerificationGas;

      log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);

      const pvgMarkUp = config.pvgMarkUp[chainId] || 0.1; // setting default pvgMarkUp to 10% incase the value for a given chainId is not set

      preVerificationGas += BigInt(
        Math.ceil(Number(toHex(totalGas)) * pvgMarkUp),
      );

      log.info(
        `preVerificationGas after bumping it up: ${preVerificationGas} on chainId: ${chainId}`,
      );

      const end = performance.now();
      log.info(`Estimating the userOp took: ${end - start} milliseconds`);

      if (chainId === BLOCKCHAINS.OP_BNB_MAINNET && baseFeePerGas === 0n) {
        preVerificationGas = BigInt(
          config.gasOverrides[BLOCKCHAINS.OP_BNB_MAINNET].preVerificationGas,
        );
      }

      return {
        code: STATUSES.SUCCESS,
        message: `Gas successfully estimated for userOp: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
        data: {
          preVerificationGas,
          verificationGasLimit,
          callGasLimit,
          validAfter,
          validUntil,
        },
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
          validAfter: 0,
          validUntil: 0,
        },
      };
    }
  }

  async simulateValidation(simulateValidationData: SimulationData) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = simulateValidationData;

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

      const data = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: "handleOps",
        args: [[userOp], userOp.sender],
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
      const ethEstimatGasResponse =
        await this.networkService.estimateGas(ethEstimateGasParams);
      const ethEstimateGasEnd = performance.now();
      log.info(
        `eth_estimateGas took: ${
          ethEstimateGasEnd - ethEstimateGasStart
        } milliseconds`,
      );

      log.info(
        `Response from eth_estimateGas: ${customJSONStringify(
          ethEstimatGasResponse,
        )} on chainId: ${chainId}`,
      );

      const ethEstimateGasError = ethEstimatGasResponse.error;
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
      } else if (typeof ethEstimatGasResponse === "string") {
        totalGas = Number(ethEstimatGasResponse);
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);
      } else {
        return {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: `Error in estimating handleOps gas: ${parseError(
            ethEstimatGasResponse.error.message,
          )}`,
          data: {
            totalGas: 0,
            userOpHash: null,
            handleOpsCallData,
          },
        };
      }

      const start = performance.now();
      const userOpHash = this.getUserOpHash(
        entryPointContract.address,
        userOp,
        chainId,
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
    validationData: ValidationData,
    entryPointContract: EntryPointContractType,
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

    if (
      !config.disableFeeValidation.includes(this.networkService.chainId) &&
      minimumAcceptableMaxPriorityFeePerGas > Number(maxPriorityFeePerGas)
    ) {
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

    if (
      !config.disableFeeValidation.includes(this.networkService.chainId) &&
      minimumAcceptableMaxFeePerGas > Number(maxFeePerGas)
    ) {
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

    let baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
    if (
      this.networkService.chainId === BLOCKCHAINS.OP_BNB_MAINNET &&
      baseFeePerGas === 0n
    ) {
      baseFeePerGas = BigInt(
        config.gasOverrides[BLOCKCHAINS.OP_BNB_MAINNET].baseFeePerGas,
      );
    }

    if (!config.disableFeeValidation.includes(this.networkService.chainId)) {
      const userOperation: UserOperationV6 = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature,
        maxFeePerGas: BigInt(maxFeePerGas),
        maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
        callData: userOp.callData,
        callGasLimit: BigInt(userOp.callGasLimit),
        verificationGasLimit: BigInt(userOp.verificationGasLimit),
        preVerificationGas: BigInt(preVerificationGas),
      };

      const networkPreVerificationGas =
        await this.gasEstimator.estimatePreVerificationGas(
          userOperation,
          BigInt(baseFeePerGas),
        );

      log.info(`networkPreVerificationGas: ${networkPreVerificationGas}`);

      const minimumAcceptablePreVerificationGas =
        Number(networkPreVerificationGas) *
        preVerificationGasThresholdPercentage;

      if (minimumAcceptablePreVerificationGas > Number(preVerificationGas)) {
        log.info(
          `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
        );
        throw new RpcError(
          `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
          BUNDLER_ERROR_CODES.PRE_VERIFICATION_GAS_TOO_LOW,
        );
      }
    }

    // Check the user operation for validation and execution errors (if debug_traceCall is supported)
    if (
      // we can't simulate deployment transactions, they will fail because of insufficient entrypoint deposit
      userOp.initCode === "0x" &&
      nodeconfig.has("supportsDebugTraceCall") &&
      nodeconfig
        .get<number[]>("supportsDebugTraceCall")
        .includes(this.networkService.chainId)
    ) {
      const traceStart = performance.now();

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
                args: [[userOp], "0xc75Bb3956c596efc6DB663cd3e2f64929d6AB0fc"],
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

  getUserOpHash(
    entryPointAddress: `0x${string}`,
    userOp: UserOperationType,
    chainId: number,
  ) {
    const userOpHash = keccak256(packUserOpForUserOpHash(userOp, true));
    const enc = encodeAbiParameters(
      parseAbiParameters("bytes32, address, uint256"),
      [userOpHash, entryPointAddress, BigInt(chainId)],
    );
    return keccak256(enc);
  }
}

// The following are the dependencies of the BundlerSimulationService class

// 💡 TIP: Always pick only the required fields from the interface
// so we don't depend on properties we don't use (easier to refactor)
export type SimulationNetworkService = Pick<
  INetworkService<IEVMAccount, EVMRawTransactionType>,
  "chainId" | "rpcUrl" | "estimateGas" | "sendRpcCall" | "provider"
>;

export type SimulationGasEstimator = Pick<
  GasEstimator,
  "estimateUserOperationGas" | "estimatePreVerificationGas"
>;
