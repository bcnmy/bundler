/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable prefer-const */
import {
  decodeErrorResult,
  encodeFunctionData,
  toHex,
} from "viem";
import {
  createArbitrumGasEstimator,
  createGasEstimator,
  createMantleGasEstimator,
  createMorphGasEstimator,
  createOptimismGasEstimator,
  createScrollGasEstimator,
  createSeiGasEstimator,
  EstimateUserOperationGas,
  IGasEstimator,
} from "entry-point-gas-estimations";
import nodeconfig from "config";
import { config } from "../../config";
import { IEVMAccount } from "../../relayer/account";
import {
  BUNDLER_ERROR_CODES,
  STATUSES,
} from "../../server/api/shared/middleware";
import { logger } from "../logger";
import { INetworkService } from "../network";
import { EVMRawTransactionType, UserOperationType } from "../types";
import {
  customJSONStringify,
  parseError,
} from "../utils";
import RpcError from "../utils/rpc-error";
import {
  EstimateUserOperationGasDataTypeV07,
  EstimateUserOperationGasReturnType,
  SimulationDataV07,
  ValidationDataV07,
} from "./types";
import { BLOCKCHAINS } from "../constants";
import { IGasPriceService } from "../gas-price";
import { ENTRY_POINT_V07_ABI } from "../entrypoint-v7/abiv7";
import { getUserOpHash, packUserOperation } from "../entrypoint-v7/PackedUserOperation";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// TODO: We probably don't need a separate file for this, but I'm keeping it for now as a reference
export class BundlerSimulationServiceV07 {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  gasPriceService: IGasPriceService;

  gasEstimator: IGasEstimator;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    gasPriceService: IGasPriceService,
  ) {
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.gasEstimator = createGasEstimator({
      rpcUrl: this.networkService.rpcUrl,
    });

    if (config.optimismNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createOptimismGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });
    }

    if (config.arbitrumNetworks.includes(this.networkService.chainId))
      this.gasEstimator = createArbitrumGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });

    if (config.mantleNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createMantleGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });
    }

    if (config.scrollNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createScrollGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });
    }

    if (config.morphNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createMorphGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });
    }

    if (config.seiNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createSeiGasEstimator({
        rpcUrl: this.networkService.rpcUrl,
      });
    }
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataTypeV07,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const { userOp, entryPointContract, chainId, stateOverrideSet } =
        estimateUserOperationGasData;

      this.gasEstimator.setEntryPointAddress(entryPointContract.address);

      const start = performance.now();
      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      // // for userOp completeness
      // if (!userOp.paymasterAndData) {
      //   userOp.paymasterAndData = "0x";
      // }

      // for userOp completeness
      if (!userOp.signature) {
        // signature not present, using default ECDSA
        userOp.signature =
          "0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b";
      }

      // for userOp completeness
      if (
        !userOp.maxFeePerGas ||
        userOp.maxFeePerGas === BigInt(0) ||
        (userOp.maxFeePerGas as unknown as string) === "0x" ||
        (userOp.maxFeePerGas as unknown as string) === "0"
      ) {
        // setting a non zero value as division with maxFeePerGas will happen
        userOp.maxFeePerGas = BigInt(1);
        if (
          config.optimismNetworks.includes(chainId) ||
          config.mantleNetworks.includes(chainId)
        ) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === "bigint") {
            userOp.maxFeePerGas = gasPrice;
          } else {
            const { maxFeePerGas } = gasPrice;
            userOp.maxFeePerGas = maxFeePerGas;
          }
        }
      }

      // // for userOp completeness
      // userOp.callGasLimit = BigInt(58000);
      // userOp.verificationGasLimit = BigInt(58000);
      // userOp.preVerificationGas = BigInt(58000);

      // for userOp completeness
      if (
        !userOp.maxPriorityFeePerGas ||
        userOp.maxPriorityFeePerGas === BigInt(0) ||
        (userOp.maxPriorityFeePerGas as unknown as string) === "0x" ||
        (userOp.maxPriorityFeePerGas as unknown as string) === "0"
      ) {
        // setting a non zero value as division with maxPriorityFeePerGas will happen
        userOp.maxPriorityFeePerGas = BigInt(1);
        if (
          config.optimismNetworks.includes(chainId) ||
          config.mantleNetworks.includes(chainId)
        ) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === "bigint") {
            userOp.maxPriorityFeePerGas = gasPrice;
          } else {
            const { maxPriorityFeePerGas } = gasPrice;
            userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;
          }
        }
      }

      log.info(
        `userOp to be used for estimation: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      let supportsEthCallStateOverride = true;
      let supportsEthCallByteCodeOverride = true;
      if (config.networksNotSupportingEthCallStateOverrides.includes(chainId)) {
        supportsEthCallStateOverride = false;
      } else if (
        config.networksNotSupportingEthCallBytecodeStateOverrides.includes(
          chainId,
        )
      ) {
        supportsEthCallByteCodeOverride = false;
      }

      if (userOp.initCode !== "0x") {
        supportsEthCallByteCodeOverride = false;
      }
      // For testing/debugging purposes you can override the AA gas limits in the config file
      // and avoid calling the gas estimation package
      if (nodeconfig.has(`hardcodedGasLimits.${chainId}`)) {
        const { verificationGasLimit, callGasLimit, preVerificationGas } =
          nodeconfig.get<any>(`hardcodedGasLimits.${chainId}`);

        const validAfter = Date.now();
        const validUntil = Date.now() + 10000000000;
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
      }

      // Otherwise get the gas limits from the gas estimation package
      let response: EstimateUserOperationGas;
      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();

      try {
        response = await this.gasEstimator.estimateUserOperationGas({
          userOperation: {...userOp,initCode: "0x", paymasterAndData:"0x"}, // TODO fix me
          stateOverrideSet,
          supportsEthCallByteCodeOverride,
          supportsEthCallStateOverride,
          baseFeePerGas,
        });

        log.info(
          `estimation response from gas estimation package: ${customJSONStringify(
            response,
          )} on chainId: ${chainId}`,
        );
      } catch (error: any) {
        log.error(
          `[entry-point-gas-estimations] package threw an error: ${error.message}`,
        );
        throw error;
      }

      let {
        verificationGasLimit,
        callGasLimit,
        preVerificationGas,
        validAfter,
        validUntil,
      } = response;

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

      const data = {
        preVerificationGas,
        verificationGasLimit,
        callGasLimit,
        validAfter,
        validUntil,
      };
      log.info(
        `estimateUserOperationGas result: ${JSON.stringify(data, null, 2)}`,
        { chainId },
      );

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

  async simulateValidation(simulateValidationData: SimulationDataV07) {
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

      await this.checkUserOperationForRejection({
        userOp,
        networkMaxPriorityFeePerGas: maxPriorityFeePerGas,
        networkMaxFeePerGas: maxFeePerGas,
      });

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
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);
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
  ): Promise<boolean> {
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

    const { preVerificationGas: networkPreVerificationGas } =
      await this.gasEstimator.calculatePreVerificationGas({
        userOperation: {...userOp, initCode:"0x", paymasterAndData: "0x"}, // TODO fix me, use new UserOp in gas estimation
        baseFeePerGas,
      });
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

    log.info(
      `maxFeePerGas, maxPriorityFeePerGas and preVerification are within acceptable limits`,
    );
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
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
      // eslint-disable-next-line
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
