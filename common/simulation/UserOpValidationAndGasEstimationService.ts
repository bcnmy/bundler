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
  EstimateUserOperationGasParamsType,
  EstimateUserOperationGasReturnType,
  EstimateHandleOpsParamsType,
  SimulateValidationParamsType,
  SimulateValidationReturnType,
  UserOpValidationParamsType,
  ParseSimulationValidationResultReturnType,
} from './types';
import { IUserOpValidationAndGasEstimationService } from './interface';
import { BLOCKCHAINS } from '../constants';
import { calcGasPrice } from './L2/Abitrum';

const log = logger(module);
export class UserOpValidationAndGasEstimationService implements
 IUserOpValidationAndGasEstimationService {
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
    const parsedResult = this.parseSimulateValidationResult(
      userOp,
      simulationResult,
    );
    return parsedResult;
  }

  async estimateHandleOps(
    estimateHandleOpsParams: EstimateHandleOpsParamsType,
  ): Promise<string> {
    const { userOps, entryPointContract } = estimateHandleOpsParams;

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
    estimateUserOperationGasParams: EstimateUserOperationGasParamsType,
  ): Promise<EstimateUserOperationGasReturnType> {
    const { userOp, entryPointContract, chainId } = estimateUserOperationGasParams;
    // 1. callGasLimit
    let callGasLimit = 0;
    if (userOp.callData === '0x') {
      callGasLimit = 21000;
    } else if (userOp.initCode !== '0x') {
      // wallet not deployed yet
      callGasLimit = 600000;
    } else {
      callGasLimit = await this.networkService
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
    }
    log.info(`callGasLimit: ${callGasLimit} on chainId: ${chainId}`);

    // 2. verificationGasLimit
    const initGas = await this.estimateCreationGas(
      entryPointContract.address,
      userOp.initCode,
    );
    log.info(`initGas: ${initGas} on chainId: ${chainId}`);
    const DefaultGasLimits = {
      validateUserOpGas: 100000,
      validatePaymasterUserOpGas: 100000,
      postOpGas: 10877,
    };
    const validateUserOpGas = DefaultGasLimits.validatePaymasterUserOpGas
      + DefaultGasLimits.validateUserOpGas;
    const { postOpGas } = DefaultGasLimits;

    let verificationGasLimit = BigNumber.from(validateUserOpGas)
      .add(initGas)
      .toNumber();

    if (BigNumber.from(postOpGas).gt(verificationGasLimit)) {
      verificationGasLimit = postOpGas;
    }
    log.info(
      `dummy verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId}`,
    );
    // validAfter, validUntil, deadline
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );
    const fullUserOp = {
      ...userOp,
      // default values for missing fields.
      signature: userOp.signature
        || '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: userOp.callGasLimit || BigNumber.from('0'),
      maxFeePerGas: userOp.maxFeePerGas || BigNumber.from('0'),
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas || BigNumber.from('0'),
      preVerificationGas: userOp.preVerificationGas || BigNumber.from('0'),
      verificationGasLimit: userOp.verificationGasLimit || '3000000',
    };

    let returnInfo;

    log.info(
      `fullUserOp: ${JSON.stringify(fullUserOp)} on chainId: ${chainId}`,
    );

    try {
      const simulationResult: any = await entryPointStatic.callStatic
        .simulateValidation(fullUserOp)
        .catch((e: any) => e);
      log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
      returnInfo = this.parseSimulateValidationResult(
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

    let { validAfter, validUntil } = returnInfo;
    const { preOpGas } = returnInfo;
    verificationGasLimit = BigNumber.from(preOpGas).toNumber() + 100000;
    log.info(
      `post simulation verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId}`,
    );

    validAfter = BigNumber.from(validAfter);
    validUntil = BigNumber.from(validUntil);
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined;
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined;
    }
    let deadline: any;
    if (returnInfo.deadline) {
      deadline = BigNumber.from(returnInfo.deadline);
    }

    const simulateUserOp = {
      ...userOp,
      // default values for missing fields.
      signature: userOp.signature
        || '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: userOp.callGasLimit || '0x00',
      maxFeePerGas: userOp.maxFeePerGas || '0x00',
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas || '0x00',
      preVerificationGas: userOp.preVerificationGas || '0x00',
    };
    // 3. preVerificationGas
    const preVerificationGas = await this.calcPreVerificationGas(
      simulateUserOp,
      chainId,
      entryPointContract,
    );
    log.info(
      `preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`,
    );

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
        deadline,
      },
    };
  }

  async estimateCreationGas(
    entryPointAddress: string,
    initCode?: string,
  ): Promise<number> {
    if (initCode == null || initCode === '0x') return 0;
    const deployerAddress = initCode.substring(0, 42);
    const deployerCallData = `0x${initCode.substring(42)}`;
    return this.networkService
      .estimateCallGas(entryPointAddress, deployerAddress, deployerCallData)
      .then((callGasLimitResponse) => callGasLimitResponse.toNumber())
      .catch((error) => {
        const message = error.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
        log.info(`message: ${JSON.stringify(message)}`);
        return 0;
      });
  }

  parseSimulateValidationResult(
    userOp: UserOperationType,
    simulationResult: any,
  ): ParseSimulationValidationResultReturnType {
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
  ): Promise<number> {
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
    let ret = Math.round(
      callDataCost
        + ov.fixed / ov.bundleSize
        + ov.perUserOp
        + ov.perUserOpWord * packed.length,
    );

    // calculate offset for Arbitrum
    if (
      chainId === BLOCKCHAINS.ARBITRUM_GOERLI_TESTNET
      || BLOCKCHAINS.ARBITRUM_NOVA_MAINNET
      || BLOCKCHAINS.ARBITRUM_ONE_MAINNET
    ) {
      const data = await calcGasPrice(
        entryPointContract.address,
        userOp,
        chainId,
      );
      ret += data;
    }
    return ret;
  }
}