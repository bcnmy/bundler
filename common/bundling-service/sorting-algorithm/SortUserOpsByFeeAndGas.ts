/* eslint-disable class-methods-use-this */
import { BigNumber } from 'ethers';
import { EVMRawTransactionType, UserOperationType } from '../../types';
import { INetworkService } from '../../network';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { SortUserOpsByFeeAndGasParamsType } from '../types';

export class SortUserOpsByFeeAndGas {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(sortUserOpsByFeeAndGasParams: SortUserOpsByFeeAndGasParamsType) {
    const {
      networkService,
    } = sortUserOpsByFeeAndGasParams;
    this.networkService = networkService;
  }

  sort(userOps: UserOperationType[]): UserOperationType[] {
    userOps.sort((userOp1: UserOperationType, userOp2: UserOperationType) => {
      const userOp1GasPrice = this.getUserOpGasPrice(userOp1);
      const userOp2GasPrice = this.getUserOpGasPrice(userOp2);
      if (userOp1GasPrice === userOp2GasPrice) {
        return BigNumber.from(
          userOp1.preVerificationGas,
        ).toNumber() - BigNumber.from(userOp2.preVerificationGas).toNumber();
      }
      return userOp1GasPrice - userOp2GasPrice;
    });
    return userOps;
  }

  private getUserOpGasPrice(userOp: UserOperationType): number {
    const { maxFeePerGas, maxPriorityFeePerGas } = userOp;
    if (maxFeePerGas === maxPriorityFeePerGas) {
      // legacy mode (for networks that don't support basefee opcode)
      return BigNumber.from(maxFeePerGas).toNumber();
    }
    return BigNumber.from(maxPriorityFeePerGas).toNumber();
  }
}
