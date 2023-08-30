import { ethers, BigNumber } from 'ethers';
import { arrayify, hexlify } from 'ethers/lib/utils';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import {
  DefaultGasOverheadType,
  EVMRawTransactionType,
  UserOperationType,
} from '../types';
import { packUserOp } from '../utils';
import { BLOCKCHAINS } from '../constants';
import {
  EstimateUserOperationGasDataType,
  EstimateUserOpGasFieldsType,
} from './types';
import { calcArbitrumPreVerificationGas, calcOptimismPreVerificationGas } from './L2';

const log = logger(module);
export class BundlerGasEstimationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async estimateCreationGas(
    sender: string,
    initCode?: string,
  ): Promise<number> {
    if (initCode == null || initCode === '0x') return 0;
    const deployerAddress = initCode.substring(0, 42);
    const deployerCallData = `0x${initCode.substring(42)}`;
    return this.networkService
      .estimateCallGas(sender, deployerAddress, deployerCallData)
      .then((callGasLimitResponse) => callGasLimitResponse.toNumber())
      .catch((error) => {
        const message = error.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted';
        log.info(`message: ${JSON.stringify(message)}`);
        return 0;
      });
  }

  async estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType,
  ): Promise<EstimateUserOpGasFieldsType> {
    const { userOp, entryPointContract, chainId } = estimateUserOperationGasData;
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
      `verificationGasLimit: ${verificationGasLimit} on chainId: ${chainId}`,
    );

    const simulateUserOp = {
      ...userOp,
      // default values for missing fields.
      signature:
        '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: 0,
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      preVerificationGas: 0,
    };
    // 3. preVerificationGas
    const preVerificationGas = await BundlerGasEstimationService.calcPreVerificationGas(
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
      },
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
      || chainId === BLOCKCHAINS.ARBITRUM_NOVA_MAINNET
      || chainId === BLOCKCHAINS.ARBITRUM_ONE_MAINNET
    ) {
      const data = await calcArbitrumPreVerificationGas(
        entryPointContract.address,
        userOp,
        chainId,
      );
      ret += data;
    } else if (
      chainId === BLOCKCHAINS.OPTIMISM_GOERLI_TESTNET
      || chainId === BLOCKCHAINS.OPTIMISM_MAINNET
      || chainId === BLOCKCHAINS.BASE_GOERLI_TESTNET
      || chainId === BLOCKCHAINS.BASE_MAINNET
    ) {
      const data = await calcOptimismPreVerificationGas(
        userOp,
        chainId,
      );
      ret += data;
    } else if (
      chainId === BLOCKCHAINS.AVALANCHE_MAINNET
      || chainId === BLOCKCHAINS.AVALANCHE_TESTNET
    ) {
      ret += 20000;
    }
    return ret;
  }
}
