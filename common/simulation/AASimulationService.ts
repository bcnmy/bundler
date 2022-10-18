import { config } from '../../config';
import { EVMAccount } from '../../relayer/src/services/account';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { AASimulationDataType, SimulationResponseType } from './types';

export class AASimulationService {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async simulate(
    simulationData: AASimulationDataType,
  ): Promise<SimulationResponseType> {
    // entry point contract call to check
    // https://github.com/eth-infinitism/account-abstraction/blob/5b7130c2645cbba7fe4540a96997163b44c1aafd/contracts/core/EntryPoint.sol#L245
    const { userOp, entryPointContract } = simulationData;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userOpSimulation = await entryPointContract.simulateValidation(userOp);
    const estimatedGasForUserOp = await this.networkService.estimateGas(entryPointContract, 'handleOps', [userOp], config.zeroAddress);
    return {
      isSimulationSuccessful: true,
      gasLimitFromSimulation: estimatedGasForUserOp,
    };
  }
}
