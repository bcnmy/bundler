/* eslint-disable prefer-const */
import { ethers, BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
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
} from './types';
import { BLOCKCHAINS } from '../constants';
import { calcGasPrice } from './L2/Abitrum';

const log = logger(module);
export class BundlerSimulationAndValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async validateAndEstimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOperationGasReturnType> {
    try {
      const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;

      log.info(`userOp received: ${JSON.stringify(userOp)} on chainId: ${chainId}`);

      const fullUserOp = {
        ...userOp,
        paymasterAndData: userOp.paymasterAndData || '0x',
        callGasLimit: userOp.callGasLimit || '0x',
        maxFeePerGas: userOp.maxFeePerGas === '0' || userOp.maxFeePerGas === '0x' || !userOp.maxFeePerGas ? '1' : userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas === '0' || userOp.maxPriorityFeePerGas === '0x' || !userOp.maxPriorityFeePerGas ? '1' : userOp.maxPriorityFeePerGas,
        preVerificationGas: userOp.preVerificationGas || '0x',
        verificationGasLimit: userOp.verificationGasLimit || '3000000',
        signature: userOp.signature || '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b',
      };

      log.info(`fullUserOp received: ${JSON.stringify(fullUserOp)} on chainId: ${chainId}`);

      // preVerificationGas
      const preVerificationGas = await BundlerSimulationAndValidationService.calcPreVerificationGas(
        fullUserOp,
        chainId,
        entryPointContract,
      );
      log.info(`preVerificationGas: ${preVerificationGas} on chainId: ${chainId}`);

      // total gas for the entire handleOps call
      try {
        const entryPointStatic = entryPointContract.connect(
          this.networkService.ethersProvider.getSigner(config.zeroAddress),
        );
        const simulateHandleOpResult = await entryPointStatic.callStatic
          .simulateHandleOp(
            fullUserOp,
            '0x0000000000000000000000000000000000000000',
            '0x',
          )
          .catch((e: any) => e);
        log.info(`simulateHandleOpResult: ${JSON.stringify(simulateHandleOpResult)}`);
        const parsedResult = BundlerSimulationAndValidationService.parseSimulateHandleOpResult(
          fullUserOp,
          simulateHandleOpResult,
        );
        let {
          preOpGas,
          paid,
          validAfter,
          validUntil,
        } = parsedResult;
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

        const totalExecutionGas = Math.ceil((BigNumber.from(paid).toNumber())
        / (BigNumber.from(userOp.maxFeePerGas === '0' || userOp.maxFeePerGas === '0x' || !userOp.maxFeePerGas ? '1' : userOp.maxFeePerGas).toNumber()));
        log.info(`totalExecutionGas: ${totalExecutionGas} on chainId: ${chainId}`);

        const callGasLimit = totalExecutionGas - preVerificationGas;
        log.info(`callGasLimit: ${callGasLimit} on chainId: ${chainId}`);

        let totalGas;
        if (userOp.paymasterAndData !== '0x') {
          totalGas = callGasLimit + 3 * verificationGasLimit + preVerificationGas;
        } else {
          totalGas = callGasLimit + verificationGasLimit + preVerificationGas;
        }
        log.info(`totalGas: ${totalGas} on chainId: ${chainId}`);

        let userOpHash: string = '';
        try {
          userOpHash = await entryPointContract.getUserOpHash(userOp);
          log.info(
            `userOpHash: ${userOpHash} for userOp: ${JSON.stringify(userOp)}`,
          );
        } catch (error) {
          log.info(
            `Error in getting userOpHash for userOp: ${JSON.stringify(
              userOp,
            )} with error: ${parseError(error)}`,
          );
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
            userOpHash,
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

    // if (!targetSuccess) {
    //   throw new RpcError(
    //     'Call data execution failed',
    //     BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED,
    //   );
    // }
    return {
      preOpGas,
      paid,
      validAfter,
      validUntil,
      targetSuccess,
      targetResult,
    };
  }

  static async calcPreVerificationGas(
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
      signature: userOp.signature || hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
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
      || chainId === BLOCKCHAINS.ARBITRUM_NOVA_MAINNET
      || chainId === BLOCKCHAINS.ARBITRUM_ONE_MAINNET
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
