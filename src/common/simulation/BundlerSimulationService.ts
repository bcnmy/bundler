/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable prefer-const */
import { decodeErrorResult, encodeFunctionData, toHex } from "viem";
import {
  createArbitrumGasEstimator,
  createGasEstimator,
  createMantleGasEstimator,
  createOptimismGasEstimator,
  createScrollGasEstimator,
  handleFailedOp,
  IGasEstimator,
} from "entry-point-gas-estimations";
import { config } from "../../config";
import { IEVMAccount } from "../../relayer/account";
import {
  BUNDLER_ERROR_CODES,
  STATUSES,
} from "../../server/api/shared/middleware";
import { getLogger } from "../logger";
import { INetworkService } from "../network";
import { EVMRawTransactionType } from "../types";
import { customJSONStringify, parseError } from "../utils";
import RpcError from "../utils/rpc-error";
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  SimulationData,
} from "./types";
import { IGasPriceService } from "../gas-price";
import {
  checkUserOperationForRejection,
  getCompleteUserOp,
  getUserOpHash,
  readjustGasLimits,
  removeSpecialCharacters,
} from "./utils";

const log = getLogger(module);

export class BundlerSimulationService {
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

      const completeUserOp = await getCompleteUserOp({
        userOp,
        chainId,
        config,
        gasPriceService: this.gasPriceService,
      });

      log.info(
        `userOp to be used for estimation: ${customJSONStringify(
          completeUserOp,
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

      if (completeUserOp.initCode !== "0x") {
        supportsEthCallByteCodeOverride = false;
      }

      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();

      const response = await this.gasEstimator.estimateUserOperationGas({
        userOperation: completeUserOp,
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

      const readjustedGasLimits = await readjustGasLimits({
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        chainId,
        config,
      });

      verificationGasLimit = readjustedGasLimits.verificationGasLimit;
      callGasLimit = readjustedGasLimits.callGasLimit;
      preVerificationGas = readjustedGasLimits.preVerificationGas;

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
        await this.gasPriceService.getParsedGasPrice();
      let gasPrice = Math.ceil(Number(maxFeePerGas) * 2).toString(16);

      const {
        maxPriorityFeePerGasThresholdPercentage,
        maxFeePerGasThresholdPercentage,
        preVerificationGasThresholdPercentage,
      } = config;

      const { preVerificationGas } =
        await this.gasEstimator.calculatePreVerificationGas({
          userOperation: userOp,
        });

      await checkUserOperationForRejection({
        userOp,
        networkMaxPriorityFeePerGas: maxPriorityFeePerGas,
        networkMaxFeePerGas: maxFeePerGas,
        networkPreVerificationGas: preVerificationGas,
        maxPriorityFeePerGasThresholdPercentage,
        maxFeePerGasThresholdPercentage,
        preVerificationGasThresholdPercentage,
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
          handleFailedOp(errorDescription.args[1]);
        } else {
          const { args } = errorDescription;

          const reason = args[1]
            ? args[1].toString()
            : errorDescription.errorName;
          const message = removeSpecialCharacters(reason);
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
      const userOpHash = getUserOpHash(
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
}
