import { BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { BUNDLER_VALIDATION_STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { DefaultGasOverheadType, EVMRawTransactionType, UserOperationType } from '../types';
import { fillEntity, packUserOp, parseError } from '../utils';
import RpcError from '../utils/rpc-error';
import { BundlerSimulationDataType, EstimateUserOperationGasDataType, SimulationResponseType } from './types';

const log = logger(module);
export class BundlerSimulationAndValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async simulateAndValidate(
    simulationData: BundlerSimulationDataType,
  ): Promise<SimulationResponseType> {
    const { userOp, entryPointContract, chainId } = simulationData;
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    let isSimulationSuccessful = true;
    try {
      const simulationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
        .catch((e: any) => e);
      log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
      BundlerSimulationAndValidationService.parseUserOpSimulationResult(userOp, simulationResult);
    } catch (error: any) {
      log.info(`Bundler Simulation failed: ${parseError(error)}`);
      isSimulationSuccessful = false;
      return {
        isSimulationSuccessful,
        data: {
          gasLimitFromSimulation: 0,
        },
        code: error.code,
        message: parseError(error),
      };
    }

    const estimatedGasForUserOp = await this.networkService.estimateGas(
      entryPointContract,
      'handleOps',
      [[userOp],
        config.feeOption.refundReceiver[chainId]],
      config.zeroAddress,
    );
    // const estimatedGasForUserOp = BigNumber.from('3000000');

    log.info(`Estimated gas is: ${estimatedGasForUserOp} from ethers for userOp: ${JSON.stringify(userOp)}`);
    if (!estimatedGasForUserOp || !estimatedGasForUserOp._isBigNumber) {
      return {
        isSimulationSuccessful: false,
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
      isSimulationSuccessful,
      data: {
        gasLimitFromSimulation: estimatedGasForUserOp,
        userOpHash,
      },
      message: 'Success',
    };
  }

  static parseUserOpSimulationResult(userOp: UserOperationType, simulationResult: any) {
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
  ) {
    const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;

    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    const simulationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
      .catch((e: any) => e);
    log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
    const {
      returnInfo,
    } = BundlerSimulationAndValidationService.parseUserOpSimulationResult(userOp, simulationResult);

    const callGasLimit = await this.networkService.estimateGas(
      entryPointContract,
      'handleOps',
      [[userOp],
        config.feeOption.refundReceiver[chainId]],
      config.zeroAddress,
    )
      .then((callGasLimitResponse) => callGasLimitResponse.toNumber())
      .catch((err) => {
        const message = err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
        log.info(`message: ${JSON.stringify(message)}`);
        return 0;
      });

    const preVerificationGas = BundlerSimulationAndValidationService.calcPreVerificationGas(userOp);

    const verificationGasLimit = BigNumber.from(returnInfo.preOpGas).toNumber();
    let deadline: any;
    if (returnInfo.deadline) {
      deadline = BigNumber.from(returnInfo.deadline);
    }

    return {
      preVerificationGas,
      verificationGasLimit,
      callGasLimit,
      deadline,
    };
  }

  static calcPreVerificationGas(
    userOp: Partial<UserOperationType>,
    overheads?: Partial<DefaultGasOverheadType>,
  ) {
    const { defaultGasOverheads } = config;
    const ov = { ...defaultGasOverheads, ...(overheads ?? {}) };
    const p: UserOperationType = {
      // dummy values, in case the UserOp is incomplete.
      preVerificationGas: 21000, // dummy value, just for calldata cost
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
      ...userOp,
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
