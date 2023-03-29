import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType, UserOperationType } from '../types';
import { parseError } from '../utils';
import { AASimulationDataType, SimulationResponseType } from './types';

const log = logger(module);
export class AASimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async simulate(
    simulationData: AASimulationDataType,
  ): Promise<SimulationResponseType> {
    // entry point contract call to check
    // https://github.com/eth-infinitism/account-abstraction/blob/5b7130c2645cbba7fe4540a96997163b44c1aafd/contracts/core/EntryPoint.sol#L245
    const { userOp, entryPointContract, chainId } = simulationData;
    const entryPointStatic = entryPointContract.connect(
      this.networkService.ethersProvider.getSigner(config.zeroAddress),
    );

    let isSimulationSuccessful = true;
    if(entryPointContract.address.toLowerCase() === "0x119df1582e0dd7334595b8280180f336c959f3bb") {
      try {
        await entryPointStatic.callStatic.simulateValidation(userOp, false);
      } catch (error: any) {
        log.info(`AA Simulation failed: ${JSON.stringify(error)}`);
        isSimulationSuccessful = false;
        return {
          isSimulationSuccessful,
          gasLimitFromSimulation: 0,
          msgFromSimulation: JSON.stringify(error),
        };
      }
    } else {
      try {
        const simulationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
          .catch((e: any) => e);
        log.info(`simulationResult: ${JSON.stringify(simulationResult)}`);
        AASimulationService.parseUserOpSimulationResult(userOp, simulationResult);
      } catch (error: any) {
        log.info(`AA Simulation failed: ${parseError(error)}`);
        isSimulationSuccessful = false;
        return {
          isSimulationSuccessful,
          data: {
            gasLimitFromSimulation: 0,
          },
          message: parseError(error),
        };
      }
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
          isSimulationSuccessful: false,
          data: {
            gasLimitFromSimulation: 0,
          },
          message: parseError(estimatedGasForUserOp),
        };
      }
    } catch (error) {
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
        paymaster = null;
      }
      // eslint-disable-next-line
      const msg: string = simulationResult.errorArgs?.reason ?? simulationResult.toString()

      if (!paymaster) {
        log.info(`account validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw Error(`account validation failed: ${msg}`);
      } else {
        log.info(`paymaster validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw Error(`paymaster validation failed: ${msg}`);
      }
    }
    return true;

    // const {
    //   returnInfo,
    //   senderInfo,
    // factoryInfo,
    // paymasterInfo,
    // aggregatorInfo, // may be missing (exists only SimulationResultWithAggregator
    // } = simulationResult.errorArgs;

    // extract address from "data" (first 20 bytes)
    // add it as "addr" member to the "stakeinfo" struct
    // if no address, then return "undefined" instead of struct.
    // function fillEntity(data: BytesLike, info: StakeInfo): StakeInfo | undefined {
    //   const addr = getAddr(data);
    //   return addr == null
    //     ? undefined
    //     : {
    //       ...info,
    //       addr,
    //     };
    // }

    // return {
    //   returnInfo,
    //   senderInfo: {
    //     ...senderInfo,
    //     addr: userOp.sender,
    //   },
    // factoryInfo: fillEntity(userOp.initCode, factoryInfo),
    // paymasterInfo: fillEntity(userOp.paymasterAndData, paymasterInfo),
    // aggregatorInfo: fillEntity(aggregatorInfo?.actualAggregator, aggregatorInfo?.stakeInfo),
    // };
  }
}
