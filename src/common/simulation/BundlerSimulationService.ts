/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable prefer-const */
import {
  decodeErrorResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbiParameters,
  toHex,
} from "viem";
import {
  createArbitrumGasEstimator,
  createGasEstimator,
  createMantleGasEstimator,
  createOptimismGasEstimator,
  createScrollGasEstimator,
  IGasEstimator,
} from "entry-point-gas-estimations";
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

import {
  AlchemySimulationService,
  TenderlySimulationService,
} from "./external-simulation";
import { IGasPriceService } from "../gas-price";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class BundlerSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  gasPriceService: IGasPriceService;

  alchemySimulationService: AlchemySimulationService;

  gasEstimator: IGasEstimator;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    tenderlySimulationService: TenderlySimulationService,
    alchemySimulationService: AlchemySimulationService,
    gasPriceService: IGasPriceService,
  ) {
    this.networkService = networkService;
    this.tenderlySimulationService = tenderlySimulationService;
    this.alchemySimulationService = alchemySimulationService;
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
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
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

      // for userOp completeness
      userOp.callGasLimit = BigInt(20000000);
      userOp.verificationGasLimit = BigInt(10000000);
      userOp.preVerificationGas = BigInt(100000);

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

      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();

      const response = await this.gasEstimator.estimateUserOperationGas({
        userOperation: userOp,
        stateOverrideSet,
        supportsEthCallByteCodeOverride,
        supportsEthCallStateOverride,
        baseFeePerGas,
      });
      log.info(
        `estimation respone from gas estimation package: ${customJSONStringify(
          response,
        )} on chainId: ${chainId}`,
      );

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

      preVerificationGas += BigInt(
        Math.ceil(Number(toHex(totalGas)) * config.pvgMarkUp[chainId]),
      );

      log.info(
        `preVerificationGas after bumping it up: ${preVerificationGas} on chainId: ${chainId}`,
      );

      const end = performance.now();
      log.info(`Estimating the userOp took: ${end - start} milliseconds`);

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

  async simulateValidationAndExecution(
    simulateValidationAndExecutionData: SimulationData,
  ) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } =
        simulateValidationAndExecutionData;

      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );

      const gasPrice = await this.gasPriceService.getGasPrice();
      let networkMaxPriorityFeePerGas: bigint;
      let networkMaxFeePerGas: bigint;
  
      if (typeof gasPrice === "bigint") {
        networkMaxPriorityFeePerGas = gasPrice;
        networkMaxFeePerGas = gasPrice;
      } else {
        networkMaxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
        networkMaxFeePerGas = gasPrice.maxFeePerGas;
      }

      await this.checkUserOperationForRejection(
        {
          userOp,
          networkMaxPriorityFeePerGas,
          networkMaxFeePerGas
        },
      );

      let reason: string | undefined;
      let totalGas: number;
      let data: string | undefined;
      if (config.alchemySimulateExecutionSupportedNetworks.includes(chainId)) {
        try {
          const start = performance.now();
          const response =
            await this.alchemySimulationService.simulateHandleOps({
              userOp,
              entryPointContract,
              chainId,
            });
          reason = response.reason as string | undefined;
          totalGas = response.totalGas;
          data = response.data;
          const end = performance.now();
          log.info(
            `Alchemy Simulation Service's simulateHandleOps took ${
              end - start
            } milliseconds`,
          );
        } catch (error) {
          log.error(
            `Error in Alchemy Simulation Service: ${parseError(error)}`,
          );
          log.info("Retrying simulation with Tenderly Simulation service");
          const start = performance.now();
          const response =
            await this.tenderlySimulationService.simulateHandleOps({
              userOp,
              entryPointContract,
              chainId,
            });
          reason = response.reason;
          totalGas = response.totalGas;
          data = response.data;
          const end = performance.now();
          log.info(
            `Tenderly Simulation Service's simulateHandleOps took ${
              end - start
            } milliseconds`,
          );
        }
      } else {
        const start = performance.now();
        const response = await this.tenderlySimulationService.simulateHandleOps(
          {
            userOp,
            entryPointContract,
            chainId,
          },
        );
        reason = response.reason;
        totalGas = response.totalGas;
        data = response.data;
        const end = performance.now();
        log.info(
          `Tenderly Simulation Service's simulateHandleOps took ${
            end - start
          } milliseconds`,
        );
      }
      handleOpsCallData = data;

      if (reason) {
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
        throw new RpcError(
          `Transaction reverted in simulation with reason: ${reason}. Use handleOpsCallData to simulate transaction to check transaction execution steps`,
          BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED,
        );
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
      log.error(parseError(error));
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

  async simulateValidation(simulateValidationData: SimulationData) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = simulateValidationData;

      log.info(
        `userOp received: ${customJSONStringify(
          userOp,
        )} on chainId: ${chainId}`,
      );
      
      const gasPriceFromService = await this.gasPriceService.getGasPrice();
      let gasPrice;
      let networkMaxPriorityFeePerGas: bigint;
      let networkMaxFeePerGas: bigint;

      if (typeof gasPriceFromService === "bigint") {
        gasPrice = Math.ceil(Number(gasPriceFromService) * 2).toString(16);
        networkMaxPriorityFeePerGas = gasPriceFromService;
        networkMaxFeePerGas = gasPriceFromService;
      } else {
        gasPrice = Math.ceil(
          Number(gasPriceFromService.maxFeePerGas) * 2,
        ).toString(16);
        networkMaxPriorityFeePerGas = gasPriceFromService.maxPriorityFeePerGas;
        networkMaxFeePerGas = gasPriceFromService.maxFeePerGas;
      }

      await this.checkUserOperationForRejection({
        userOp,
        networkMaxPriorityFeePerGas,
        networkMaxFeePerGas,
      });

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

  async checkUserOperationForRejection(validationData: ValidationData): Promise<boolean | RpcError> {
    const { userOp, networkMaxFeePerGas, networkMaxPriorityFeePerGas } = validationData;

    const { maxPriorityFeePerGas, maxFeePerGas, preVerificationGas } = userOp;

    const {
      maxPriorityFeePerGasThresholdPercentage,
      maxFeePerGasThresholdPercentage,
      preVerificationGasThresholdPercentage
    } = config;

    if (
      networkMaxPriorityFeePerGas *
        BigInt(maxPriorityFeePerGasThresholdPercentage) >
      maxPriorityFeePerGas
    ) {
      throw new RpcError(
        `maxPriorityFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${networkMaxPriorityFeePerGas * BigInt(maxPriorityFeePerGasThresholdPercentage)}`,
        BUNDLER_ERROR_CODES.MAX_PRIORITY_FEE_PER_GAS_TOO_LOW,
      );
    }

    if (
      networkMaxFeePerGas * BigInt(maxFeePerGasThresholdPercentage) >
      maxFeePerGas
    ) {
      throw new RpcError(
        `maxFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxFeePerGas: ${networkMaxPriorityFeePerGas * BigInt(maxFeePerGas)}`,
        BUNDLER_ERROR_CODES.MAX_FEE_PER_GAS_TOO_LOW,
      );
    }

    const networkPreVerificationGas =
      await this.gasEstimator.calculatePreVerificationGas({
        userOperation: userOp,
      });

    if (
      networkPreVerificationGas.preVerificationGas *
        BigInt(preVerificationGasThresholdPercentage) >
      preVerificationGas
    ) {
      throw new RpcError(
        `preVerificationGas in userOp: ${preVerificationGas} is lower than expected preVerificationGas: ${networkPreVerificationGas.preVerificationGas * BigInt(preVerificationGasThresholdPercentage)}`,
        BUNDLER_ERROR_CODES.PRE_VERIFICATION_GAS_TOO_LOW,
      );
    }

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
        throw new RpcError(
          msg,
          BUNDLER_ERROR_CODES.SIMULATE_VALIDATION_FAILED,
        );
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

  // eslint-disable-next-line class-methods-use-this
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
