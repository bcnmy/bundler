/* eslint-disable prefer-const */
import { ethers, BigNumber } from 'ethers';
import { arrayify, defaultAbiCoder, keccak256 } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import {
  BUNDLER_VALIDATION_STATUSES,
  STATUSES,
} from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType,
  EVMRawTransactionType,
  UserOperationType,
} from '../types';
import { packUserOp, packUserOpForUserOpHash, parseError } from '../utils';
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
} from '../constants';
import { AlchemySimulationService, TenderlySimulationService } from './external-simulation';
import { calcArbitrumPreVerificationGas, calcOptimismPreVerificationGas } from './L2';
import { IGasPrice } from '../gas-price';

const log = logger(module);
export class BundlerSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  gasPriceService: IGasPrice;

  alchemySimulationService: AlchemySimulationService;

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
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;

      const start = performance.now();
      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      // creating fullUserOp in case of estimation
      userOp.callGasLimit = 5000000;
      userOp.verificationGasLimit = 5000000;
      userOp.preVerificationGas = 1000000;

      if ([43113, 43114].includes(chainId)) {
        userOp.callGasLimit = 20000000;
      }

      if (!userOp.paymasterAndData) {
        userOp.paymasterAndData = '0x';
      }

      if (!userOp.signature) {
        // signature not present, using default ECDSA
        userOp.signature = '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b';
      }
      if (!userOp.maxFeePerGas || userOp.maxFeePerGas === 0 || (userOp.maxFeePerGas as unknown as string) === '0x' || (userOp.maxFeePerGas as unknown as string) === '0') {
        // setting a non zero value as division with maxFeePerGas will happen
        userOp.maxFeePerGas = 1;
        if (OptimismNetworks.includes(chainId)) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === 'string') {
            userOp.maxFeePerGas = Number(gasPrice);
          } else {
            const {
              maxFeePerGas,
            } = gasPrice;
            userOp.maxFeePerGas = Number(maxFeePerGas);
          }
        }
      }

      if (!userOp.maxPriorityFeePerGas || userOp.maxPriorityFeePerGas === 0 || (userOp.maxPriorityFeePerGas as unknown as string) === '0x' || (userOp.maxPriorityFeePerGas as unknown as string) === '0') {
        // setting a non zero value as division with maxPriorityFeePerGas will happen
        userOp.maxPriorityFeePerGas = 1;
        if (OptimismNetworks.includes(chainId)) {
          const gasPrice = await this.gasPriceService.getGasPrice();
          if (typeof gasPrice === 'string') {
            userOp.maxPriorityFeePerGas = Number(gasPrice);
          } else {
            const {
              maxPriorityFeePerGas,
            } = gasPrice;
            userOp.maxPriorityFeePerGas = Number(maxPriorityFeePerGas);
          }
        }
      }

      if (chainId === 84531) {
        userOp.verificationGasLimit = 1000000;
        userOp.callGasLimit = 1000000;
      }
      const end = performance.now();
      log.info(`Preparing the userOp took: ${end - start} milliseconds`);

      const preVerificationGasStart = performance.now();
      // preVerificationGas
      let preVerificationGas = await this.calcPreVerificationGas(
        userOp,
        chainId,
        entryPointContract,
      );
      log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);
      userOp.preVerificationGas = preVerificationGas;
      const preVerificationGasEnd = performance.now();
      log.info(`calcPreVerificationGas took: ${preVerificationGasEnd - preVerificationGasStart} milliseconds`);

      log.info(`userOp to used to simulate in eth_call: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      const { data } = await entryPointContract.populateTransaction.simulateHandleOp(
        userOp,
        config.zeroAddress,
        '0x',
      );

      let ethCallParams;

      // polygon zk evm nodes don't support state overrides
      if (PolygonZKEvmNetworks.includes(chainId)) {
        log.info('Request on polygon zk evm hence not doing state overrides in eth_call');
        ethCallParams = [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: entryPointContract.address,
            data,
          },
          'latest',
        ];
      } else {
        log.info('Request not on polygon zk evm hence doing state overrides in eth_call');
        ethCallParams = [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: entryPointContract.address,
            data,
          },
          'latest',
          {
            [userOp.sender]:
                {
                  balance: '0xFFFFFFFFFFFFFFFFFFFF',
                },
          },
        ];
      }

      const ethCallStart = performance.now();
      const simulateHandleOpResult = await this.networkService.sendRpcCall(
        'eth_call',
        ethCallParams,
      );
      const ethCallEnd = performance.now();
      log.info(`eth_call took: ${ethCallEnd - ethCallStart} milliseconds`);

      const ethCallData = simulateHandleOpResult.data.error.data;
      log.info(`ethCallData: ${ethCallData}`);

      const errorDescription = entryPointContract.interface.parseError(ethCallData);
      const { args } = errorDescription;

      if (errorDescription.name === 'ExecutionResult') {
        const executionResultDecodingStart = performance.now();
        const preOpGas = Number(args[0]);
        log.info(`preOpGas: ${preOpGas}`);
        const paid = Number(args[1]);
        log.info(`paid: ${paid}`);
        let validAfter = args[2];
        log.info(`validAfter: ${validAfter}`);
        let validUntil = args[3];
        log.info(`validUntil: ${validUntil}`);

        validAfter = BigNumber.from(validAfter);
        validUntil = BigNumber.from(validUntil);
        if (validUntil === BigNumber.from(0)) {
          validUntil = undefined;
        }
        if (validAfter === BigNumber.from(0)) {
          validAfter = undefined;
        }

        // 5000 gas for unaccounted gas in verification phase
        const verificationGasLimit = Math.round((
          (preOpGas - preVerificationGas) * 1.2
        )) + 5000;
        log.info(`verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId} after 1.2 multiplier on ${preOpGas} and ${preVerificationGas}`);

        let totalGas = paid / userOp.maxFeePerGas;
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);

        let callGasLimit = totalGas - preOpGas + 30000;
        log.info(`call gas limit: ${callGasLimit} on chainId: ${chainId}`);

        if ([137, 80001].includes(chainId)) {
          const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
          log.info(`baseFeePerGas: ${baseFeePerGas} on chainId: ${chainId}`);
          totalGas = Math.round(paid / Math.min(
            baseFeePerGas + Number(userOp.maxPriorityFeePerGas),
            Number(userOp.maxFeePerGas),
          ));
          log.info(`totalGas after calculating for polygon networks: ${totalGas}`);
          callGasLimit = Math.round(totalGas - preOpGas + 30000);
          log.info(`callGasLimit after calculating for polygon networks: ${callGasLimit}`);
        }

        if (totalGas < 500000) {
          preVerificationGas += 20000;
        } else if (totalGas > 500000 && totalGas < 1000000) {
          preVerificationGas += 35000;
        } else {
          preVerificationGas += 50000;
        }

        if (callGasLimit > 500000) {
          callGasLimit += 100000;
        }

        // if (chainId === 10 || chainId === 420 || chainId === 8453 || chainId === 84531) {
        //   log.info(`chainId: ${chainId} is OP stack hence increasing callGasLimit by 150K`);
        //   callGasLimit += 150000;
        // }
        log.info(`call gas limit after checking for optimism: ${callGasLimit} on chainId: ${chainId}`);

        if (LineaNetworks.includes(chainId)) {
          preVerificationGas += Math.round((verificationGasLimit + callGasLimit) / 3);
        }

        const executionResultDecodingEnd = performance.now();
        log.info(`Decoding ExecutionResult took: ${executionResultDecodingEnd - executionResultDecodingStart} milliseconds`);

        return {
          code: STATUSES.SUCCESS,
          message: `Gas successfully estimated for userOp: ${JSON.stringify(
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
      if (errorDescription.name === 'FailedOp') {
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
            code: STATUSES.NOT_FOUND,
            message: 'Revert reason not matching known cases',
            data: {
              preVerificationGas: 0,
              verificationGasLimit: 0,
              callGasLimit: 0,
              validAfter: 0,
              validUntil: 0,
              totalGas: 0,
            },
          };
        }
      } else {
        return {
          code: STATUSES.NOT_FOUND,
          message: 'Entry Point execution revert method not found',
          data: {
            preVerificationGas: 0,
            verificationGasLimit: 0,
            callGasLimit: 0,
            validAfter: 0,
            validUntil: 0,
            totalGas: 0,
          },
        };
      }
    } catch (error: any) {
      log.error(`Error in estimating user op: ${parseError(error)}`);
      return {
        code: error.code,
        message: parseError(error),
        data: {
          preVerificationGas: 0,
          verificationGasLimit: 0,
          callGasLimit: 0,
          validAfter: 0,
          validUntil: 0,
          totalGas: 0,
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

      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      let reason: string | undefined;
      let totalGas: number;
      let data: string | undefined;
      if (AlchemySimulateExecutionSupportedNetworks.includes(chainId)) {
        const start = performance.now();
        const response = await this.alchemySimulationService.simulateHandleOps({
          userOp,
          entryPointContract,
          chainId,
        });
        reason = response.reason;
        totalGas = response.totalGas;
        data = response.data;
        const end = performance.now();
        log.info(`Alchemy Simulation Service's simulateHandleOps took ${end - start} milliseconds`);
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

      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      const {
        data,
      } = await entryPointContract.populateTransaction.handleOps([userOp], userOp.sender);

      const {
        publicKey,
      } = config.relayerManagers[0].ownerAccountDetails[chainId];
      log.info(`Simulating with from address: ${publicKey} on chainId: ${chainId}`);

      const gasPriceFromService = await this.gasPriceService.getGasPrice();
      let gasPrice;

      if (typeof gasPriceFromService === 'string') {
        gasPrice = Number(gasPriceFromService).toString(16);
      } else {
        gasPrice = Number(gasPriceFromService.maxFeePerGas).toString(16);
      }

      const ethEstimateGasStart = performance.now();
      const response = await this.networkService.sendRpcCall(
        'eth_estimateGas',
        [{
          from: publicKey,
          to: entryPointContract.address,
          data,
          gasPrice: `0x${gasPrice}`,
        }],
      );
      const ethEstimateGasEnd = performance.now();
      log.info(`eth_esatimateGas took: ${ethEstimateGasEnd - ethEstimateGasStart} milliseconds`);

      log.info(`Response from eth_estimateGas: ${JSON.stringify(response.data)}`);

      const ethEstimateGasError = response.data.error;
      let totalGas = 0;

      if (ethEstimateGasError && Object.keys(ethEstimateGasError).length > 0) {
        const error = entryPointContract.interface.parseError(ethEstimateGasError);
        const {
          args,
        } = error;
        const { reason } = args;
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
      } else {
        const { result } = response.data;
        totalGas = Number(result);
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
          `Error: ${JSON.stringify(
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
          `account validation failed: ${msg} for userOp: ${JSON.stringify(
            userOp,
          )}`,
        );
        throw new RpcError(
          msg,
          BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED,
        );
      } else {
        log.info(
          `paymaster validation failed: ${msg} for userOp: ${JSON.stringify(
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
    entryPointContract: ethers.Contract,
    overheads?: Partial<DefaultGasOverheadType>,
  ) {
    const { defaultGasOverheads } = config;
    const ov = { ...defaultGasOverheads, ...(overheads ?? {}) };

    const packed = arrayify(packUserOp(userOp, false));
    const callDataCost = packed
      .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
      .reduce((sum, x) => sum + x);
    let ret = Math.round(
      callDataCost
        + ov.fixed / ov.bundleSize
        + ov.perUserOp
        + ov.perUserOpWord * packed.length,
    );

    if (
      ArbitrumNetworks.includes(chainId)
    ) {
      const data = await calcArbitrumPreVerificationGas(
        entryPointContract.address,
        userOp,
        chainId,
      );
      ret += data;
    } else if (
      OptimismNetworks.includes(chainId)
    ) {
      const baseFeePerGas = await this.gasPriceService.getBaseFeePerGas();
      const data = await calcOptimismPreVerificationGas(
        userOp,
        chainId,
        baseFeePerGas,
      );
      ret += data;
    }
    return ret;
  }

  // eslint-disable-next-line class-methods-use-this
  getUserOpHash(
    entryPointAddress: string,
    userOp: UserOperationType,
    chainId: number,
  ) {
    const userOpHash = keccak256(packUserOpForUserOpHash(userOp, true));
    const enc = defaultAbiCoder.encode(['bytes32', 'address', 'uint256'], [userOpHash, entryPointAddress, chainId]);
    return keccak256(enc);
  }
}
