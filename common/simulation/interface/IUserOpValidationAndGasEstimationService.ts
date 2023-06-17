import { BigNumberish, ethers } from 'ethers';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { DefaultGasOverheadType, EVMRawTransactionType, UserOperationType } from '../../types';
import {
  SimulateValidationParamsType,
  SimulateValidationReturnType,
  EstimateHandleOpsParamsType,
  EstimateUserOperationGasParamsType,
  EstimateUserOperationGasReturnType,
  ParseSimulationValidationResultReturnType,
} from '../types';

export interface IUserOpValidationAndGasEstimationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  simulateValidation(
    simualteValidationParams: SimulateValidationParamsType
  ): Promise<SimulateValidationReturnType>
  estimateHandleOps(
    estimateHandleOpsParams: EstimateHandleOpsParamsType,
  ): Promise<BigNumberish>
  estimateUserOperationGas(
    estimateUserOperationGasParams: EstimateUserOperationGasParamsType,
  ): Promise<EstimateUserOperationGasReturnType>
  estimateCreationGas(
    entryPointAddress: string,
    initCode?: string,
  ): Promise<number>
  parseSimulateValidationResult(
    userOp: UserOperationType,
    simulationResult: any,
  ): ParseSimulationValidationResultReturnType
  calcPreVerificationGas(
    userOp: UserOperationType,
    chainId: number,
    entryPointContract: ethers.Contract,
    overheads?: Partial<DefaultGasOverheadType>,
  ): Promise<number>
}
