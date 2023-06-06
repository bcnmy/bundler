/* eslint-disable class-methods-use-this */
import { ethers, BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import {
  BUNDLER_VALIDATION_STATUSES,
} from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType,
  EVMRawTransactionType,
  UserOperationType,
} from '../types';
import { fillEntity, packUserOp } from '../utils';
import RpcError from '../utils/rpc-error';
import {
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

    const { data } = await entryPointContract
      .populateTransaction.handleOps([userOps], config.zeroAddress);

    const handleOpsGasLimit = await this.networkService
      .estimateCallGas(
        config.zeroAddress,
        entryPointContract.address,
        data as string,
      );
    return BigNumber.from(handleOpsGasLimit).toHexString();
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
