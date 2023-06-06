import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';
import {
  BundlerValidationResponseType,
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  ValidateUserOpDataType,
} from '../types';

export interface IUserOpValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  validate(
    validateUserOpData: ValidateUserOpDataType
  ): Promise<BundlerValidationResponseType>;
  estimateGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType
  ): Promise<EstimateUserOperationGasReturnType>
}
