import { BigNumberish } from 'ethers';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';
import { SimulateValidationParamsType, SimulateValidationReturnType, SimulateHandleOpsParamsType } from '../types';

export interface IUserOpValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  simulateValidation(
    simualteValidationParams: SimulateValidationParamsType
  ): Promise<SimulateValidationReturnType>
  simulateHandleOps(
    simualteHandleOpsParams: SimulateHandleOpsParamsType,
  ): Promise<BigNumberish>
}
