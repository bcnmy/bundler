import { BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType, EVMRawTransactionType, EntityInfoType, UserOperationType,
} from '../types';
import { fillEntity, packUserOp, parseError } from '../utils';
import RpcError from '../utils/rpc-error';
import {
  ValidateUserOpDataType,
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  BundlerValidationResponseType,
} from './types';
import { IBundlerValidationService } from './interface';

const log = logger(module);
export class BundlerValidationService implements IBundlerValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async validateUserOperation(
    vaidateUserOpData: ValidateUserOpDataType,
  ): Promise<BundlerValidationResponseType> {
    const { userOp, entryPointContract, chainId } = vaidateUserOpData;
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    let isValidationSuccessful = true;
    let entityInfo: EntityInfoType;
    log.info(`userOp: ${JSON.stringify(userOp)} on chainId: ${chainId}`);
    try {
      const simulateValidationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
        .catch((e: any) => e);
      log.info(`simulateValidationResult: ${JSON.stringify(simulateValidationResult)}`);
      entityInfo = BundlerValidationService.parseUserOpSimulationResult(
        userOp,
        simulateValidationResult,
      );
    } catch (error: any) {
      log.info(`Bundler Simulation failed: ${parseError(error)}`);
      isValidationSuccessful = false;
      return {
        isValidationSuccessful,
        data: {
          gasLimitFromSimulation: 0,
        },
        code: error.code,
        message: parseError(error),
      };
    }
    let estimatedGasForUserOp;

    try {
      estimatedGasForUserOp = await this.networkService.estimateGas(
        entryPointContract,
        'handleOps',
        [[userOp],
          config.feeOption.refundReceiver[chainId]],
        config.zeroAddress,
      );
      log.info(`Estimated gas is: ${estimatedGasForUserOp} from ethers for userOp: ${JSON.stringify(userOp)}`);
      if (!estimatedGasForUserOp || !estimatedGasForUserOp._isBigNumber) {
        return {
          isValidationSuccessful: false,
          data: {
            gasLimitFromSimulation: 0,
          },
          message: parseError(estimatedGasForUserOp),
        };
      }
    } catch (error) {
      return {
        isValidationSuccessful: false,
        data: {
          gasLimitFromSimulation: 0,
        },
        message: parseError(estimatedGasForUserOp),
      };
    }

    let userOpHash: string = '';
    try {
      userOpHash = await entryPointContract.getUserOpHash(userOp);
      log.info(`userOpHash: ${userOpHash} for userOp: ${JSON.stringify(userOp)}`);
    } catch (error) {
      log.info(`Error in getting userOpHash for userOp: ${JSON.stringify(userOp)} with error: ${parseError(error)}`);
    }

    return {
      isValidationSuccessful,
      data: {
        gasLimitFromSimulation: estimatedGasForUserOp,
        entityInfo,
        userOpHash,
      },
      message: 'Success',
    };
  }

  private static parseUserOpSimulationResult(userOp: UserOperationType, simulationResult: any) {
    if (!simulationResult?.errorName?.startsWith('ValidationResult')) {
      log.info(`Inside ${!simulationResult?.errorName?.startsWith('ValidationResult')}`);
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      log.info(`simulationResult.errorArgs: ${simulationResult.errorArgs}`);
      if (!simulationResult.errorArgs) {
        throw Error(`errorArgs not present in simulationResult: ${JSON.stringify(simulationResult)}`);
      }
      let { paymaster } = simulationResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string = simulationResult.errorArgs?.reason ?? simulationResult.toString()

      if (paymaster == null) {
        log.info(`account validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new RpcError(msg, BUNDLER_VALIDATION_STATUSES.SIMULATE_VALIDATION_FAILED);
      } else {
        log.info(`paymaster validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new RpcError(msg, BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED);
      }
    }
    const {
      returnInfo,
      senderInfo,
      factoryInfo,
      paymasterInfo,
      aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    } = simulationResult.errorArgs;

    return {
      returnInfo,
      senderInfo: {
        ...senderInfo,
        addr: userOp.sender,
      },
      factoryInfo: fillEntity(userOp.initCode, factoryInfo),
      paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
      aggregatorInfo: fillEntity(aggregatorInfo?.actualAggregator, aggregatorInfo?.stakeInfo),
    };
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;

    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    const callGasLimit = await this.networkService.estimateCallGas(
      entryPointContract.address,
      userOp.sender,
      userOp.callData,
    )
      .then((callGasLimitResponse) => callGasLimitResponse.toNumber())
      .catch((error) => {
        const message = error.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
        log.info(`message: ${JSON.stringify(message)}`);
        return 0;
      });

    log.info(`callGasLimit: ${callGasLimit} on chainId: ${chainId}`);

    const fullUserOp = {
      ...userOp,
      // default values for missing fields.
      signature: '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: BigNumber.from('0'),
      maxFeePerGas: BigNumber.from('0'),
      maxPriorityFeePerGas: BigNumber.from('0'),
      preVerificationGas: BigNumber.from('0'),
      verificationGasLimit: '0xF4240', // 1000000
    };

    let returnInfo;

    log.info(`fullUserOp: ${JSON.stringify(fullUserOp)} on chainId: ${chainId}`);

    try {
      const simulationResult: any = await entryPointStatic.callStatic.simulateValidation(fullUserOp)
        .catch((e: any) => e);
      log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
      returnInfo = BundlerValidationService.parseUserOpSimulationResult(
        userOp,
        simulationResult,
      ).returnInfo;
    } catch (error: any) {
      log.info(`Bundler Simulation failed: ${parseError(error)}`);
      return {
        code: error.code,
        message: parseError(error),
        data: {
          preVerificationGas: 0,
          verificationGasLimit: 0,
          callGasLimit: 0,
          validAfter: 0,
          validUntil: 0,
          deadline: 0,
        },
      };
    }

    const preVerificationGas = BundlerValidationService.calcPreVerificationGas(
      userOp,
    );
    log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);

    const { preOpGas } = returnInfo;
    let {
      validAfter,
      validUntil,
    } = returnInfo;

    validAfter = BigNumber.from(validAfter);
    validUntil = BigNumber.from(validUntil);
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined;
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined;
    }

    const verificationGasLimit = BigNumber.from(preOpGas).toNumber();
    log.info(`verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId}`);
    let deadline: any;
    if (returnInfo.deadline) {
      deadline = BigNumber.from(returnInfo.deadline);
    }

    return {
      code: STATUSES.SUCCESS,
      message: `Gas successfully estimated for userOp: ${JSON.stringify(userOp)} on chainId: ${chainId}`,
      data: {
        preVerificationGas,
        verificationGasLimit,
        callGasLimit,
        validAfter,
        validUntil,
        deadline,
      },
    };
  }

  private static calcPreVerificationGas(
    userOp: UserOperationType,
    overheads?: Partial<DefaultGasOverheadType>,
  ) {
    const { defaultGasOverheads } = config;
    const ov = { ...defaultGasOverheads, ...(overheads ?? {}) };
    const p: UserOperationType = {
      ...userOp,
      // dummy values, in case the UserOp is incomplete.
      callGasLimit: BigNumber.from('0'),
      maxFeePerGas: BigNumber.from('0'),
      maxPriorityFeePerGas: BigNumber.from('0'),
      verificationGasLimit: '0xF4240', // 1000000
      preVerificationGas: 21000, // dummy value, just for calldata cost
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
    } as any;

    const packed = arrayify(packUserOp(p, false));
    const callDataCost = packed
      .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
      .reduce((sum, x) => sum + x);
    const ret = Math.round(
      callDataCost
        + ov.fixed / ov.bundleSize
        + ov.perUserOp
        + ov.perUserOpWord * packed.length,
    );
    return ret;
  }
}
