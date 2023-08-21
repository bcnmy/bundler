/* eslint-disable prefer-const */
import { ethers, BigNumber } from 'ethers';
import { arrayify } from 'ethers/lib/utils';
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
import { packUserOp, parseError } from '../utils';
import RpcError from '../utils/rpc-error';
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  ValidateUserOperationData,
} from './types';
import {
  OptimismNetworks,
  PolygonZKEvmNetworks,
  ArbitrumNetworks,
  LineaNetworks,
} from '../constants';
import { TenderlySimulationService } from './external-simulation';
import { calcArbitrumPreVerificationGas, calcOptimismPreVerificationGas } from './L2';

const log = logger(module);
export class BundlerSimulationAndValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    tenderlySimulationService: TenderlySimulationService,
  ) {
    this.networkService = networkService;
    this.tenderlySimulationService = tenderlySimulationService;
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;

      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      // creating fullUserOp in case of estimation
      userOp.callGasLimit = 1000000;
      userOp.verificationGasLimit = 1000000;
      userOp.preVerificationGas = 1000000;

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
      }

      if (chainId === 84531) {
        userOp.verificationGasLimit = 1000000;
        userOp.callGasLimit = 1000000;
      }

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

      const simulateHandleOpResult = await this.networkService.sendRpcCall(
        'eth_call',
        ethCallParams,
      );
      const ethCallData = simulateHandleOpResult.data.error.data;
      log.info(`ethCallData: ${ethCallData}`);

      // The first 4 bytes of the data is the function signature
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const functionSignature = ethCallData.slice(0, 10);
      log.info(`functionSignature: ${functionSignature}`);

      // The rest of the data is the encoded parameters
      const encodedParams = `0x${ethCallData.slice(10)}`;
      log.info(`encodedParams: ${encodedParams}`);

      // Here is the data layout of the parameters for ExecutionResult
      const executionResultTypes = ['uint256', 'uint256', 'uint48', 'uint48', 'bool', 'bytes'];

      let executionResultDecodedParams;

      try {
        // Decode the parameters
        executionResultDecodedParams = ethers.utils.defaultAbiCoder.decode(
          executionResultTypes,
          encodedParams,
        );
      } catch (error: any) {
        // coming in catch means that revert reason is FailedOp
        const failedOpTypes = ['uint256', 'string'];

        // Decode the parameters
        const failedOpDecodedParams = ethers.utils.defaultAbiCoder.decode(
          failedOpTypes,
          encodedParams,
        );

        log.info(`FailedOp Decoded Parameters: ${JSON.stringify(failedOpDecodedParams)}`);
        const opIndex = failedOpDecodedParams[0];
        log.info(`opIndex: ${opIndex}`);
        const revertReason = failedOpDecodedParams[1];
        log.info(`revertReason: ${revertReason}`);

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

      log.info(`Execution Result Decoded Parameters: ${JSON.stringify(executionResultDecodedParams)}`);
      const preOpGas = executionResultDecodedParams[0];
      log.info(`preOpGas: ${preOpGas}`);
      const paid = executionResultDecodedParams[1];
      log.info(`paid: ${paid}`);
      let validAfter = executionResultDecodedParams[2];
      log.info(`validAfter: ${validAfter}`);
      let validUntil = executionResultDecodedParams[3];
      log.info(`validUntil: ${validUntil}`);

      validAfter = BigNumber.from(validAfter);
      validUntil = BigNumber.from(validUntil);
      if (validUntil === BigNumber.from(0)) {
        validUntil = undefined;
      }
      if (validAfter === BigNumber.from(0)) {
        validAfter = undefined;
      }

      // preVerificationGas
      let preVerificationGas = await this.calcPreVerificationGas(
        userOp,
        chainId,
        entryPointContract,
      );
      log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);

      const verificationGasLimit = (
        (preOpGas - preVerificationGas) * 3
      ) / 2;
      log.info(`verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId} after 1.5 multiplier on ${preOpGas} and ${preVerificationGas}`);

      const totalGas = paid / userOp.maxFeePerGas;
      log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);

      let callGasLimit = totalGas - preOpGas + 21000 + 50000;
      log.info(`call gas limit: ${callGasLimit} on chainId: ${chainId}`);

      if (chainId === 10 || chainId === 420 || chainId === 8453 || chainId === 84531) {
        log.info(`chainId: ${chainId} is OP stack chainId hence increasing callGasLimit by 150K`);
        callGasLimit += 150000;
      }
      log.info(`call gas limit: ${callGasLimit} on chainId: ${chainId}`);

      if (userOp.initCode === '0x') {
        const callGasLimitFromEthers = await this.networkService
          .estimateCallGas(
            entryPointContract.address,
            userOp.sender,
            userOp.callData,
          )
          .then((callGasLimitResponse) => callGasLimitResponse.toNumber())
          .catch((error) => {
            const message = error.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
            log.info(`message: ${JSON.stringify(message)}`);
            throw new RpcError(
              `call data execution failed with message: ${message}`,
              BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
            );
          });

        log.info(`callGasLimitFromEthers: ${callGasLimitFromEthers} on chainId: ${chainId}`);
        callGasLimit = Math.max(callGasLimit, callGasLimitFromEthers);
      }

      if (LineaNetworks.includes(chainId)) {
        preVerificationGas += (verificationGasLimit + callGasLimit) / 3;
      }

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
    } catch (error: any) {
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

  async validateUserOperation(
    validateUserOperationData: ValidateUserOperationData,
  ) {
    let handleOpsCallData;
    try {
      const { userOp, entryPointContract, chainId } = validateUserOperationData;

      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);
      const {
        reason,
        totalGas,
        data,
      } = await this.tenderlySimulationService.simulateHandleOps({
        userOp,
        entryPointContract,
        chainId,
      });
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

      const userOpHash = await entryPointContract.getUserOpHash(userOp);
      log.info(
        `userOpHash: ${userOpHash} on chainId: ${chainId}`,
      );

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
      const baseFeePerGas = await this.networkService.getBaseFeePerGas();
      const data = await calcOptimismPreVerificationGas(
        userOp,
        chainId,
        baseFeePerGas,
      );
      ret += data;
    }
    return ret;
  }
}
