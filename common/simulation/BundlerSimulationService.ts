/* eslint-disable import/no-import-module-exports */
/* eslint-disable prefer-const */
import {
  decodeErrorResult,
  encodeAbiParameters,
  encodeFunctionData,
  getContract,
  keccak256,
  parseAbiParameters,
  toBytes,
  toHex,
} from 'viem';
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import {
  BUNDLER_VALIDATION_STATUSES,
  STATUSES,
} from '../../server/src/middleware';
import { logger } from '../logger';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType,
  EVMRawTransactionType,
  EntryPointContractType,
  OptimismL1GasPriceOracleContractType,
  UserOperationType,
} from '../types';
import {
  customJSONStringify, packUserOp, packUserOpForUserOpHash, parseError
} from '../utils';
import RpcError from '../utils/rpc-error';
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  SimulateValidationAndExecutionData,
  SimulateValidationData,
} from './types';
import {
  OptimismNetworks,
  PolygonZKEvmNetworks,
  ArbitrumNetworks,
  LineaNetworks,
  AlchemySimulateExecutionSupportedNetworks,
  AstarNetworks,
  OPTIMISM_L1_GAS_PRICE_ORACLE,
} from '../constants';
import { AlchemySimulationService, TenderlySimulationService } from './external-simulation';
import { IGasPrice } from '../gas-price';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export class BundlerSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  gasPriceService: IGasPrice;

  alchemySimulationService: AlchemySimulationService;

  optimismL1GasPriceOracleMap: { [chainId: number]: OptimismL1GasPriceOracleContractType } = {};

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    tenderlySimulationService: TenderlySimulationService,
    alchemySimulationService: AlchemySimulationService,
    gasPriceService: IGasPrice,
  ) {
    this.networkService = networkService;
    this.tenderlySimulationService = tenderlySimulationService;
    this.alchemySimulationService = alchemySimulationService;
    this.gasPriceService = gasPriceService;

    if (OptimismNetworks.includes(this.networkService.chainId)) {
      // setting up optimism gas oracle
      this.optimismL1GasPriceOracleMap[this.networkService.chainId] = getContract({
        abi: OPTIMISM_L1_GAS_PRICE_ORACLE,
        address: '0x420000000000000000000000000000000000000F',
        publicClient: networkService.provider,
      });
    }
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const {
        userOp, entryPointContract,
        chainId, stateOverrideSet,
      } = estimateUserOperationGasData;

      const start = performance.now();
      log.info(`userOp received: ${customJSONStringify(userOp)} on chainId: ${chainId}`);

      // creating fullUserOp in case of estimation
      userOp.callGasLimit = BigInt(5000000);
      userOp.verificationGasLimit = BigInt(5000000);
      userOp.preVerificationGas = BigInt(1000000);

      if ([43113, 43114].includes(chainId)) {
        userOp.callGasLimit = BigInt(20000000);
      }

      if (!userOp.paymasterAndData) {
        userOp.paymasterAndData = '0x';
      }

      if (!userOp.signature) {
        // signature not present, using default ECDSA
        userOp.signature = '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b';
      }
      if (!userOp.maxFeePerGas || userOp.maxFeePerGas === BigInt(0) || (userOp.maxFeePerGas as unknown as string) === '0x' || (userOp.maxFeePerGas as unknown as string) === '0') {
        // setting a non zero value as division with maxFeePerGas will happen
        userOp.maxFeePerGas = BigInt(1);
        if (OptimismNetworks.includes(chainId)) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === 'bigint') {
            userOp.maxFeePerGas = gasPrice;
          } else {
            const {
              maxFeePerGas,
            } = gasPrice;
            userOp.maxFeePerGas = maxFeePerGas;
          }
        }
      }

      if (!userOp.maxPriorityFeePerGas || userOp.maxPriorityFeePerGas === BigInt(0) || (userOp.maxPriorityFeePerGas as unknown as string) === '0x' || (userOp.maxPriorityFeePerGas as unknown as string) === '0') {
        // setting a non zero value as division with maxPriorityFeePerGas will happen
        userOp.maxPriorityFeePerGas = BigInt(1);
        if (OptimismNetworks.includes(chainId)) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === 'bigint') {
            userOp.maxPriorityFeePerGas = gasPrice;
          } else {
            const {
              maxPriorityFeePerGas,
            } = gasPrice;
            userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;
          }
        }
      }

      const end = performance.now();
      log.info(`Preparing the userOp took: ${end - start} milliseconds`);

      const preVerificationGasStart = performance.now();
      // preVerificationGas
      let preVerificationGas = BigInt(await this.calcPreVerificationGas(
        userOp,
        chainId,
        entryPointContract,
      ));

      log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);
      userOp.preVerificationGas = preVerificationGas;
      const preVerificationGasEnd = performance.now();
      log.info(`calcPreVerificationGas took: ${preVerificationGasEnd - preVerificationGasStart} milliseconds`);

      log.info(`userOp to used to simulate in eth_call: ${customJSONStringify(userOp)} on chainId: ${chainId}`);

      const data = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: 'simulateHandleOp',
        args: [userOp, config.zeroAddress, '0x'],
      });

      let ethCallParams;

      // polygon zk evm nodes don't support state overrides
      if (PolygonZKEvmNetworks.includes(chainId) || AstarNetworks.includes(chainId)
      || [169, 3441005, 91715, 7116, 9980].includes(chainId)) {
        log.info(`Request on RPC that does not support state overrides on chainId: ${chainId}`);
        ethCallParams = [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: entryPointContract.address,
            data,
          },
          'latest',
        ];
      } else {
        const stateOverrideSetForEthCall = stateOverrideSet
        && Object.keys(stateOverrideSet).length > 0
          ? stateOverrideSet : {
            [userOp.sender]:
              {
                balance: '0xFFFFFFFFFFFFFFFFFFFF',
              },
          };
        log.info('Request not on polygon zk evm hence doing state overrides in eth_call');
        ethCallParams = [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: entryPointContract.address,
            data,
          },
          'latest',
          stateOverrideSetForEthCall,
        ];
      }

      log.info(`ethCallParams: ${customJSONStringify(ethCallParams)} on chainId: ${chainId}`);

      let ethCallData;
      try {
        const ethCallStart = performance.now();
        const simulateHandleOpResult = await this.networkService.ethCall(ethCallParams);

        const ethCallEnd = performance.now();
        log.info(`eth_call took: ${ethCallEnd - ethCallStart} milliseconds`);

        log.info(`eth_call response: ${customJSONStringify(simulateHandleOpResult)} on chainId: ${chainId}`);

        ethCallData = simulateHandleOpResult.error.data;
        log.info(`ethCallData: ${ethCallData}`);

        if (ethCallData === undefined) {
          const errorMessage = simulateHandleOpResult.error.message
            ? simulateHandleOpResult.data.message : 'eth_call RPC error';
          return {
            code: STATUSES.BAD_REQUEST,
            message: `Error while simulating userOp: ${parseError(errorMessage)}`,
            data: {
              preVerificationGas: BigInt(0),
              verificationGasLimit: BigInt(0),
              callGasLimit: BigInt(0),
              validAfter: 0,
              validUntil: 0,
              totalGas: BigInt(0),
            },
          };
        }
      } catch (error: any) {
        const errorMessage = error.response.data.error.message
          ? error.response.data.error.message : error;
        return {
          code: error.response.data.error.code || STATUSES.BAD_REQUEST,
          message: `Error while simulating userOp: ${parseError(errorMessage)}`,
          data: {
            preVerificationGas: BigInt(0),
            verificationGasLimit: BigInt(0),
            callGasLimit: BigInt(0),
            validAfter: 0,
            validUntil: 0,
            totalGas: BigInt(0),
          },
        };
      }

      const errorDescription = decodeErrorResult({
        abi: entryPointContract.abi,
        data: ethCallData,
      });

      if (errorDescription.errorName === 'ExecutionResult') {
        const { args } = errorDescription;
        const executionResultDecodingStart = performance.now();
        const preOpGas = args[0];
        log.info(`preOpGas: ${preOpGas}`);
        const paid = args[1];
        log.info(`paid: ${paid}`);
        let validAfter = args[2];
        log.info(`validAfter: ${validAfter}`);
        let validUntil = args[3];
        log.info(`validUntil: ${validUntil}`);

        // 5000 gas for unaccounted gas in verification phase
        const verificationGasLimit = BigInt(Math.ceil((
          (Number(toHex(preOpGas - preVerificationGas)) * 1.2)
        )) + 5000);
        log.info(`verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId} after 1.2 multiplier on ${preOpGas} and ${preVerificationGas}`);

        let totalGas = BigInt(Math.ceil(Number(toHex(paid)) / Number(toHex(userOp.maxFeePerGas))));
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);

        let callGasLimit = BigInt(
          Math.ceil(Number(toHex(totalGas)) - Number(toHex(preOpGas)) + 30000),
        );
        log.info(`call gas limit: ${callGasLimit} on chainId: ${chainId}`);

        if ([137, 80001, 43113, 43114, 42161, 421613, 1, 8453, 84531, 420].includes(chainId)) {
          const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
          log.info(`baseFeePerGas: ${baseFeePerGas} on chainId: ${chainId}`);
          totalGas = BigInt(Math.ceil(Number(toHex(paid)) / Math.min(
            Number(toHex(baseFeePerGas + userOp.maxPriorityFeePerGas)),
            Number(toHex(userOp.maxFeePerGas)),
          )));
          log.info(`totalGas after calculating for polygon networks: ${totalGas}`);
          callGasLimit = BigInt(
            Math.ceil(Number(toHex(totalGas)) - Number(toHex(preOpGas)) + 30000),
          );
          log.info(`callGasLimit after calculating for polygon networks: ${callGasLimit}`);
        }

        if (totalGas < 500000) {
          preVerificationGas += BigInt(20000);
        } else if (totalGas > 500000 && totalGas < 1000000) {
          preVerificationGas += BigInt(35000);
        } else {
          preVerificationGas += BigInt(50000);
        }

        if (OptimismNetworks.includes(chainId) || ArbitrumNetworks.includes(chainId)) {
          preVerificationGas += BigInt(Math.ceil(Number(toHex(totalGas)) * 0.25));
          log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);
        }

        if (callGasLimit > 500000) {
          log.info('Bumping callGasLimit by 100K for 500K+ transactions');
          callGasLimit += BigInt(100000);
        }

        if (callGasLimit > 2000000) {
          log.info('Bumping callGasLimit by 500K for 2M+ transactions');
          callGasLimit += BigInt(500000);
        }

        // edge case observed on polygon
        if (callGasLimit > 5000000) {
          log.info('Bumping callGasLimit by 500K for 5M+ transactions');
          callGasLimit += BigInt(500000);
        }

        // if (chainId === 10 || chainId === 420 || chainId === 8453 || chainId === 84531) {
        //   log.info(`chainId: ${chainId} is OP stack hence increasing callGasLimit by 150K`);
        //   callGasLimit += 150000;
        // }
        log.info(`callGasLimit after checking for optimism: ${callGasLimit} on chainId: ${chainId}`);

        if (LineaNetworks.includes(chainId)) {
          preVerificationGas += BigInt(
            Math.ceil(Number(toHex(verificationGasLimit + callGasLimit)) / 3),
          );
        }

        const executionResultDecodingEnd = performance.now();
        log.info(`Decoding ExecutionResult took: ${executionResultDecodingEnd - executionResultDecodingStart} milliseconds`);

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
            totalGas,
          },
        };
      }
      if (errorDescription.errorName === 'FailedOp') {
        const { args } = errorDescription;
        const revertReason = args[1];
        if (revertReason.includes('AA1') || revertReason.includes('AA2')) {
          log.info(`error in account on chainId: ${chainId}`);
          throw new RpcError(
            revertReason,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
          );
        } else if (revertReason.includes('AA3')) {
          log.info(`error in paymaster on chainId: ${chainId}`);
          throw new RpcError(
            revertReason,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
          );
        } else if (revertReason.includes('AA9')) {
          log.info(`error in inner handle op on chainId: ${chainId}`);
          throw new RpcError(
            revertReason,
            BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
          );
        } else if (revertReason.includes('AA4')) {
          log.info('error in verificationGasLimit being incorrect');
          throw new RpcError(
            revertReason,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
          );
        } else if (revertReason.includes('AA')) {
          log.info(`error in simulate validation on chainId: ${chainId}`);
          throw new RpcError(
            revertReason,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
          );
        } else {
          return {
            code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
            message: 'Revert reason not matching known cases',
            data: {
              preVerificationGas: BigInt(0),
              verificationGasLimit: BigInt(0),
              callGasLimit: BigInt(0),
              validAfter: 0,
              validUntil: 0,
              totalGas: BigInt(0),
            },
          };
        }
      } else {
        return {
          code: STATUSES.NOT_FOUND,
          message: 'Entry Point execution revert method not found',
          data: {
            preVerificationGas: BigInt(0),
            verificationGasLimit: BigInt(0),
            callGasLimit: BigInt(0),
            validAfter: 0,
            validUntil: 0,
            totalGas: BigInt(0),
          },
        };
      }
    } catch (error: any) {
      log.error(`Error in estimating user op: ${parseError(error)}`);
      return {
        code: error.code,
        message: parseError(error),
        data: {
          preVerificationGas: BigInt(0),
          verificationGasLimit: BigInt(0),
          callGasLimit: BigInt(0),
          validAfter: 0,
          validUntil: 0,
          totalGas: BigInt(0),
        },
      };
    }
  }

  async simulateValidationAndExecution(
    simulateValidationAndExecutionData: SimulateValidationAndExecutionData,
  ) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = simulateValidationAndExecutionData;

      log.info(`userOp received: ${customJSONStringify(userOp)} on chainId: ${chainId}`);

      let reason: string | undefined;
      let totalGas: number;
      let data: string | undefined;
      if (AlchemySimulateExecutionSupportedNetworks.includes(chainId)) {
        try {
          const start = performance.now();
          const response = await this.alchemySimulationService.simulateHandleOps({
            userOp,
            entryPointContract,
            chainId,
          });
          reason = response.reason as string | undefined;
          totalGas = response.totalGas;
          data = response.data;
          const end = performance.now();
          log.info(`Alchemy Simulation Service's simulateHandleOps took ${end - start} milliseconds`);
        } catch (error) {
          log.error(`Error in Alchemy Simulation Service: ${parseError(error)}`);
          log.info('Retrying simulation with Tenderly Simulation service');
          const start = performance.now();
          const response = await this.tenderlySimulationService.simulateHandleOps({
            userOp,
            entryPointContract,
            chainId,
          });
          reason = response.reason;
          totalGas = response.totalGas;
          data = response.data;
          const end = performance.now();
          log.info(`Tenderly Simulation Service's simulateHandleOps took ${end - start} milliseconds`);
        }
      } else {
        const start = performance.now();
        const response = await this.tenderlySimulationService.simulateHandleOps({
          userOp,
          entryPointContract,
          chainId,
        });
        reason = response.reason;
        totalGas = response.totalGas;
        data = response.data;
        const end = performance.now();
        log.info(`Tenderly Simulation Service's simulateHandleOps took ${end - start} milliseconds`);
      }
      handleOpsCallData = data;

      if (reason) {
        log.info(`Transaction failed with reason: ${reason} on chainId: ${chainId}`);
        if (reason.includes('AA1') || reason.includes('AA2')) {
          log.info(`error in account on chainId: ${chainId}`);
          const message = this.removeSpecialCharacters(reason);
          log.info(`message after removing special characters: ${message}`);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
          );
        } else if (reason.includes('AA3')) {
          log.info(`error in paymaster on chainId: ${chainId}`);
          const message = this.removeSpecialCharacters(reason);
          log.info(`message after removing special characters: ${message}`);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
          );
        } else if (reason.includes('AA9')) {
          log.info(`error in inner handle op on chainId: ${chainId}`);
          const message = this.removeSpecialCharacters(reason);
          log.info(`message after removing special characters: ${message}`);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
          );
        } else if (reason.includes('AA4')) {
          log.info('error in verificationGasLimit being incorrect');
          const message = this.removeSpecialCharacters(reason);
          log.info(`message after removing special characters: ${message}`);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
          );
        }
        throw new RpcError(
          `Transaction reverted in simulation with reason: ${reason}. Use handleOpsCallData to simulate transaction to check transaction execution steps`,
          BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
        );
      }

      const start = performance.now();
      const userOpHash = this.getUserOpHash(
        entryPointContract.address,
        userOp,
        chainId,
      );
      log.info(
        `userOpHash: ${userOpHash} on chainId: ${chainId}`,
      );
      const end = performance.now();
      log.info(`Getting userOpHash took ${end - start} milliseconds`);

      return {
        code: STATUSES.SUCCESS,
        message: 'userOp Validated',
        data: {
          totalGas,
          userOpHash,
          handleOpsCallData: null,
        },
      };
    } catch (error: any) {
      log.error((parseError(error)));
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

  async simulateValidation(
    simulateValidationData: SimulateValidationData,
  ) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = simulateValidationData;

      log.info(`userOp received: ${customJSONStringify(userOp)} on chainId: ${chainId}`);

      const data = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: 'handleOps',
        args: [[userOp], userOp.sender],
      });

      const {
        publicKey,
      } = config.relayerManagers[0].ownerAccountDetails[chainId];
      log.info(`Simulating with from address: ${publicKey} on chainId: ${chainId}`);

      const gasPriceFromService = await this.gasPriceService.getGasPrice();
      let gasPrice;

      if (typeof gasPriceFromService === 'bigint') {
        gasPrice = Math.ceil(Number(gasPriceFromService) * 2).toString(16);
      } else {
        gasPrice = Math.ceil((Number(gasPriceFromService.maxFeePerGas) * 2)).toString(16);
      }

      const ethEstimateGasParams = [{
        from: publicKey,
        to: entryPointContract.address,
        data,
        gasPrice: `0x${gasPrice}`,
      }];

      log.info(`ethEstimateGasParams: ${customJSONStringify(ethEstimateGasParams)} on chainId: ${chainId}`);

      const ethEstimateGasStart = performance.now();
      const ethEstimatGasResponse = await this.networkService.estimateGas(
        ethEstimateGasParams,
      );
      const ethEstimateGasEnd = performance.now();
      log.info(`eth_estimateGas took: ${ethEstimateGasEnd - ethEstimateGasStart} milliseconds`);

      log.info(`Response from eth_estimateGas: ${customJSONStringify(ethEstimatGasResponse)}`);

      const ethEstimateGasError = ethEstimatGasResponse.error;
      let totalGas = 0;

      if (ethEstimateGasError
        && Object.keys(ethEstimateGasError).length > 0
        && ethEstimateGasError.data
      ) {
        const errorDescription = decodeErrorResult({
          abi: entryPointContract.abi,
          data: ethEstimateGasError.data,
        });

        if (errorDescription.errorName === 'FailedOp') {
          const { args } = errorDescription;

          const reason = args[1];
          log.info(`Transaction failed with reason: ${reason} on chainId: ${chainId}`);
          if (reason.includes('AA1') || reason.includes('AA2')) {
            log.info(`error in account on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
            );
          } else if (reason.includes('AA3')) {
            log.info(`error in paymaster on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
            );
          } else if (reason.includes('AA9')) {
            log.info(`error in inner handle op on chainId: ${chainId}`);
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
            );
          } else if (reason.includes('AA4')) {
            log.info('error in verificationGasLimit being incorrect');
            const message = this.removeSpecialCharacters(reason);
            log.info(`message after removing special characters: ${message}`);
            throw new RpcError(
              message,
              BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
            );
          }
          const message = this.removeSpecialCharacters(reason);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
          );
        } else {
          const { args } = errorDescription;

          const reason = args[1] ? args[1].toString() : errorDescription.errorName;
          const message = this.removeSpecialCharacters(reason);
          throw new RpcError(
            message,
            BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
          );
        }
      } else if (
        typeof ethEstimatGasResponse === 'string'
      ) {
        totalGas = Number(ethEstimatGasResponse);
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);
      } else {
        return {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: `Error in estimating handleOps gas: ${parseError(ethEstimatGasResponse.data.error.message)}`,
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
      log.info(
        `userOpHash: ${userOpHash} on chainId: ${chainId}`,
      );
      const end = performance.now();
      log.info(`Getting userOpHash took ${end - start} milliseconds`);

      return {
        code: STATUSES.SUCCESS,
        message: 'userOp Validated',
        data: {
          totalGas,
          userOpHash,
          handleOpsCallData: null,
        },
      };
    } catch (error: any) {
      log.error((parseError(error)));
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

  // eslint-disable-next-line class-methods-use-this
  removeSpecialCharacters(input: string): string {
    const match = input.match(/AA(\d+)\s(.+)/);

    if (match) {
      const errorCode = match[1]; // e.g., "25"
      const errorMessage = match[2]; // e.g., "invalid account nonce"
      // eslint-disable-next-line no-control-regex
      const newMatch = `AA${errorCode} ${errorMessage}`.match(/AA.*?(?=\\u|\u0000)/);
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
    if (!simulateHandleOpResult?.errorName?.startsWith('ExecutionResult')) {
      log.info(
        `Inside ${!simulateHandleOpResult?.errorName?.startsWith('ExecutionResult')}`,
      );
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      log.info(`simulateHandleOpResult.errorArgs: ${simulateHandleOpResult.errorArgs}`);
      if (!simulateHandleOpResult.errorArgs) {
        throw new RpcError(
          `Error: ${customJSONStringify(
            simulateHandleOpResult,
          )}`,
          BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
        );
      }
      let { paymaster } = simulateHandleOpResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string =
        simulateHandleOpResult.errorArgs?.reason ?? simulateHandleOpResult.toString();

      if (paymaster == null) {
        log.info(
          `account validation failed: ${msg} for userOp: ${customJSONStringify(
            userOp,
          )}`,
        );
        throw new RpcError(
          msg,
          BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
        );
      } else {
        log.info(
          `paymaster validation failed: ${msg} for userOp: ${customJSONStringify(
            userOp,
          )}`,
        );
        throw new RpcError(
          msg,
          BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
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

  async calcPreVerificationGas(
    userOp: UserOperationType,
    chainId: number,
    entryPointContract: EntryPointContractType,
    overheads?: Partial<DefaultGasOverheadType>,
  ) {
    const { defaultGasOverheads } = config;
    const ov = { ...defaultGasOverheads, ...(overheads ?? {}) };

    const packed = toBytes(packUserOp(userOp, false));
    const callDataCost = packed
      .map((x: number) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
      .reduce((sum: any, x: any) => sum + x);
    let ret = Math.round(
      callDataCost
        + ov.fixed / ov.bundleSize
        + ov.perUserOp
        + ov.perUserOpWord * packed.length,
    );

    if (
      ArbitrumNetworks.includes(chainId)
    ) {
      const handleOpsData = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: 'handleOps',
        args: [[userOp], userOp.sender],
      });

      const gasEstimateForL1 = await this.networkService.provider.readContract({
        address: NODE_INTERFACE_ADDRESS,
        abi: NodeInterface__factory as any,
        functionName: 'gasEstimateL1Component',
        args: [handleOpsData],
      });

      ret += (gasEstimateForL1 as any).toNumber();
    } else if (
      OptimismNetworks.includes(chainId)
    ) {
      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
      if (!baseFeePerGas) {
        throw new RpcError(
          `baseFeePerGas not available for chainId: ${chainId}`,
          BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
        );
      }
      const handleOpsData = encodeFunctionData({
        abi: entryPointContract.abi,
        functionName: 'handleOps',
        args: [[userOp], userOp.sender],
      });

      const l1Fee = await this.networkService.provider.readContract({
        address: this.optimismL1GasPriceOracleMap[this.networkService.chainId].address,
        abi: this.optimismL1GasPriceOracleMap[this.networkService.chainId].abi,
        functionName: 'getL1Fee',
        args: [handleOpsData],
      });
      // extraPvg = l1Cost / l2Price
      const l2MaxFee = userOp.maxFeePerGas;
      const l2PriorityFee = baseFeePerGas + userOp.maxPriorityFeePerGas;

      const l2Price = l2MaxFee < l2PriorityFee ? l2MaxFee : l2PriorityFee;
      const extraPvg = l1Fee / l2Price;
      ret += Number(toHex(extraPvg));
    }
    return ret;
  }

  // eslint-disable-next-line class-methods-use-this
  getUserOpHash(
    entryPointAddress: `0x${string}`,
    userOp: UserOperationType,
    chainId: number,
  ) {
    const userOpHash = keccak256(packUserOpForUserOpHash(userOp, true));
    const enc = encodeAbiParameters(parseAbiParameters('bytes32, address, uint256'), [userOpHash, entryPointAddress, BigInt(chainId)]);
    return keccak256(enc);
  }
}
