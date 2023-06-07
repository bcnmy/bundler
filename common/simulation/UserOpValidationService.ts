/* eslint-disable class-methods-use-this */
import { ethers, BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import {
  BUNDLER_VALIDATION_STATUSES, STATUSES,
} from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType,
  EVMRawTransactionType,
  UserOperationType,
} from '../types';
import { fillEntity, packUserOp, parseError } from '../utils';
import RpcError from '../utils/rpc-error';
import {
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  SimulateHandleOpsParamsType,
  SimulateValidationParamsType,
  SimulateValidationReturnType,
  UserOpValidationParamsType,
} from './types';
import { IUserOpValidationService } from './interface';

const log = logger(module);
export class UserOpValidationService implements IUserOpValidationService {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    userOpValidationParams: UserOpValidationParamsType,
  ) {
    const {
      options,
      networkService,
    } = userOpValidationParams;
    this.networkService = networkService;
    this.chainId = options.chainId;
  }

  async simulateValidation(
    simualteValidationParams: SimulateValidationParamsType,
  ): Promise<SimulateValidationReturnType> {
    const { userOp, entryPointContract } = simualteValidationParams;
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    log.info(`userOp: ${JSON.stringify(userOp)} on chainId: ${this.chainId}`);
    const simulationResult = await entryPointStatic.callStatic
      .simulateValidation(userOp)
      .catch((e: any) => e);
    log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
    const parsedResult = this.parseUserOpSimulationResult(
      userOp,
      simulationResult,
    );
    return parsedResult;
  }

  async simulateHandleOps(
    simualteHandleOpsParams: SimulateHandleOpsParamsType,
  ): Promise<string> {
    const { userOps, entryPointContract } = simualteHandleOpsParams;

    // TODO Remove this 0xc75bb3956c596efc6db663cd3e2f64929d6ab0fc
    const { data } = await entryPointContract
      .populateTransaction.handleOps(userOps, '0xc75bb3956c596efc6db663cd3e2f64929d6ab0fc');

    const handleOpsGasLimit = await this.networkService
      .estimateCallGas(
        '0xc75bb3956c596efc6db663cd3e2f64929d6ab0fc',
        entryPointContract.address,
        data as string,
      );
    return BigNumber.from(handleOpsGasLimit).toHexString();
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    const { userOp, entryPointContract } = estimateUserOperationGasData;

    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    const callGasLimit = await this.networkService
      .estimateCallGas(
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

    log.info(`callGasLimit: ${callGasLimit} on chainId: ${this.chainId}`);

    const fullUserOp = {
      ...userOp,
      // default values for missing fields.
      signature:
        '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: BigNumber.from('0'),
      maxFeePerGas: BigNumber.from('0'),
      maxPriorityFeePerGas: BigNumber.from('0'),
      preVerificationGas: BigNumber.from('0'),
      verificationGasLimit: '0xF4240', // 1000000
    };

    let returnInfo;

    log.info(
      `fullUserOp: ${JSON.stringify(fullUserOp)} on chainId: ${this.chainId}`,
    );

    try {
      const simulationResult: any = await entryPointStatic.callStatic
        .simulateValidation(fullUserOp)
        .catch((e: any) => e);
      log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
      returnInfo = this.parseUserOpSimulationResult(
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

    const { preOpGas } = returnInfo;
    let { validAfter, validUntil } = returnInfo;

    validAfter = BigNumber.from(validAfter);
    validUntil = BigNumber.from(validUntil);
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined;
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined;
    }

    const verificationGasLimit = BigNumber.from(preOpGas).toNumber();
    log.info(
      `verificationGasLimit: ${verificationGasLimit} on chainId: ${this.chainId}`,
    );
    let deadline: any;
    if (returnInfo.deadline) {
      deadline = BigNumber.from(returnInfo.deadline);
    }

    const simulateUserOp = {
      ...fullUserOp,
      callGasLimit: '0x00',
      maxFeePerGas: '0x00',
      maxPriorityFeePerGas: '0x00',
      preVerificationGas: '0x00',
    };
    const preVerificationGas = await this.calcPreVerificationGas(
      simulateUserOp,
      this.chainId,
      entryPointContract,
    );
    log.info(
      `preVerificationGas: ${preVerificationGas} on chainId: ${this.chainId}`,
    );

    return {
      code: STATUSES.SUCCESS,
      message: `Gas successfully estimated for userOp: ${JSON.stringify(
        userOp,
      )} on chainId: ${this.chainId}`,
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

  parseUserOpSimulationResult(
    userOp: UserOperationType,
    simulationResult: any,
  ) {
    if (!simulationResult?.errorName?.startsWith('ValidationResult')) {
      log.info(
        `Inside ${!simulationResult?.errorName?.startsWith('ValidationResult')}`,
      );
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      log.info(`simulationResult.errorArgs: ${simulationResult.errorArgs}`);
      if (!simulationResult.errorArgs) {
        throw Error(
          `errorArgs not present in simulationResult: ${JSON.stringify(
            simulationResult,
          )}`,
        );
      }
      let { paymaster } = simulationResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string =
        simulationResult.errorArgs?.reason ?? simulationResult.toString();

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
      aggregatorInfo: fillEntity(
        aggregatorInfo?.actualAggregator,
        aggregatorInfo?.stakeInfo,
      ),
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
