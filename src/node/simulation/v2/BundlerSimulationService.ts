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
  handleFailedOp,
  IGasEstimator,
  UserOperation,
} from "entry-point-gas-estimations";
import { config } from "../../../common/config";
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  SimulationData,
  ValidationData,
} from "./types";
import { IGasPriceService } from "../../../common/gas-price";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
  BLOCKCHAINS,
} from "../../../common/types";
import { customJSONStringify, parseError } from "../../../common/utils";
import {
  STATUSES,
  BUNDLER_ERROR_CODES,
} from "../../../rpc/api/shared/middleware";
import { IEVMAccount } from "../../account";
import { INetworkService } from "../../network";
import { packUserOpForUserOpHash } from "./utils";
import { logger } from "../../../common/logger";
import RpcError from "../../../common/utils/rpc-error";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class BundlerSimulationService {
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;

  gasPriceService: IGasPriceService;

  gasEstimator: IGasEstimator;

  constructor(
    networkService: INetworkService<
      IEVMAccount,
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    gasPriceService: IGasPriceService,
  ) {
    this.networkService = networkService;
    this.gasPriceService = gasPriceService;
    this.gasEstimator = createGasEstimator({
      rpcUrl: config.chains.providers[this.networkService.chainId][0].url,
    });

    if (config.optimismNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createOptimismGasEstimator({
        rpcUrl: config.chains.providers[this.networkService.chainId][0].url,
      });
    }

    if (config.arbitrumNetworks.includes(this.networkService.chainId))
      this.gasEstimator = createArbitrumGasEstimator({
        rpcUrl: config.chains.providers[this.networkService.chainId][0].url,
      });

    if (config.mantleNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createMantleGasEstimator({
        rpcUrl: config.chains.providers[this.networkService.chainId][0].url,
      });
    }

    if (config.scrollNetworks.includes(this.networkService.chainId)) {
      this.gasEstimator = createScrollGasEstimator({
        rpcUrl: config.chains.providers[this.networkService.chainId][0].url,
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

      const pvgMarkUp = config.pvgMarkUp[chainId] || 0.1; // setting default pvgMarkUp to 10% incase the value for a given chainId is not set

      preVerificationGas += BigInt(
        Math.ceil(Number(toHex(totalGas)) * pvgMarkUp),
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
        await this.gasPriceService.get1559GasPrice();

      await this.checkUserOperationForRejection({
        userOp,
        networkMaxPriorityFeePerGas: maxPriorityFeePerGas,
        networkMaxFeePerGas: maxFeePerGas,
      });

      const data = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: "handleOps",
        args: [[userOp], userOp.sender],
      });

      const { ownerAddress } = config.relayerManager;
      log.info(
        `Simulating with from address: ${ownerAddress} on chainId: ${chainId}`,
      );

      const ethEstimateGasParams = {
        account: ownerAddress as `0x${string}`,
        to: entryPointContract.address,
        data,
        gasPrice: maxFeePerGas * 2n,
      };
      log.info(
        `ethEstimateGasParams: ${customJSONStringify(
          ethEstimateGasParams,
        )} on chainId: ${chainId}`,
      );

      let totalGas = 0n;

      try {
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
        totalGas = ethEstimatGasResponse;
      } catch (error: any) {
        // TODO test this and determine correct type
        if (error && Object.keys(error).length > 0 && error.data) {
          const errorDescription = decodeErrorResult({
            abi: entryPointContract.abi,
            data: error.data,
          });

          if (errorDescription.errorName === "FailedOp") {
            const { args } = errorDescription;

            const reason = args[1];
            log.info(
              `Transaction failed with reason: ${reason} on chainId: ${chainId}`,
            );
            handleFailedOp(reason);
          }
        }
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
        userOperation: userOp,
        baseFeePerGas,
      });
    log.info(`networkPreVerificationGas: ${networkPreVerificationGas}`);

    const minimumAcceptablePreVerificationGas =
      Number(networkPreVerificationGas) * preVerificationGasThresholdPercentage;

    if (minimumAcceptablePreVerificationGas > Number(preVerificationGas)) {
      log.info(
        `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
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
  getUserOpHash(
    entryPointAddress: `0x${string}`,
    userOp: UserOperation,
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
