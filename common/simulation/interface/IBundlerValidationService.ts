import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';
import {
  BundlerValidationResponseType,
  EstimateUserOperationGasDataType,
  EstimateUserOperationGasReturnType,
  ValidateUserOpDataType,
} from '../types';

export interface IBundlerValidationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  validateUserOperation(
    validateUserOpData: ValidateUserOpDataType
  ): Promise<BundlerValidationResponseType>;
  estimateUserOperationGas(
    estimateUserOperationGasData: EstimateUserOperationGasDataType
  ): Promise<EstimateUserOperationGasReturnType>
}
