import { BigNumber } from 'ethers';
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
    try {
      const simulationResult = await entryPointStatic.callStatic.simulateValidation(userOp)
        .catch((e: any) => e);
      AASimulationService.parseUserOpSimulationResult(userOp, simulationResult);
    } catch (error: any) {
      log.info(`AA Simulation failed: ${JSON.stringify(error)}`);
      log.info(`AA Simulation failed: ${error}`);
      isSimulationSuccessful = false;
      return {
        isSimulationSuccessful,
        gasLimitFromSimulation: 0,
        msgFromSimulation: JSON.stringify(error) || error,
      };
    }

    const estimatedGasForUserOpFromEthers = await this.networkService.estimateGas(
      entryPointContract,
      'handleOps',
      [[userOp],
        config.feeOption.refundReceiver[chainId]],
      config.zeroAddress,
    );
    const estimatedGasForUserOp = BigNumber.from('1000000');

    log.info(`Estimated gas is: ${estimatedGasForUserOpFromEthers} from ethers for userOp: ${JSON.stringify(userOp)}`);
    if (!estimatedGasForUserOp._isBigNumber) {
      return {
        isSimulationSuccessful: false,
        gasLimitFromSimulation: 0,
        msgFromSimulation: parseError(estimatedGasForUserOp),
      };
    }
    return {
      isSimulationSuccessful,
      gasLimitFromSimulation: estimatedGasForUserOp,
      msgFromSimulation: 'Success',
    };
  }

  static parseUserOpSimulationResult(userOp: UserOperationType, simulationResult: any) {
    if (!simulationResult?.errorName?.startsWith('ValidationResult')) {
      // parse it as FailedOp
      // if its FailedOp, then we have the paymaster param... otherwise its an Error(string)
      let { paymaster } = simulationResult.errorArgs;
      if (paymaster === config.zeroAddress) {
        paymaster = undefined;
      }
      // eslint-disable-next-line
      const msg: string = simulationResult.errorArgs?.reason ?? simulationResult.toString()

      if (paymaster == null) {
        log.info(`account validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new Error(`account validation failed: ${msg}`);
      } else {
        log.info(`paymaster validation failed: ${msg} for userOp: ${JSON.stringify(userOp)}`);
        throw new Error(`paymaster validation failed: ${msg}`);
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
