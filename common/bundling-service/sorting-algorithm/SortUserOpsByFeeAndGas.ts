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

  async sort(userOps: UserOperationType[]): Promise<UserOperationType[]> {
    userOps.sort(async (userOp1: UserOperationType, userOp2: UserOperationType) => {
      const userOp1GasPrice = await this.getUserOpGasPrice(userOp1);
      const userOp2GasPrice = await this.getUserOpGasPrice(userOp2);
      if (userOp1GasPrice === userOp2GasPrice) {
        return BigNumber.from(
          userOp1.preVerificationGas,
        ).toNumber() - BigNumber.from(userOp2.preVerificationGas).toNumber();
      }
      return userOp1GasPrice - userOp2GasPrice;
    });
    return userOps;
  }

  private async getUserOpGasPrice(userOp: UserOperationType): Promise<number> {
    const { maxFeePerGas, maxPriorityFeePerGas } = userOp;
    if (maxFeePerGas === maxPriorityFeePerGas) {
      // legacy mode (for networks that don't support basefee opcode)
      return BigNumber.from(maxFeePerGas).toNumber();
    }
    // TODO make it fetch from cache
    const baseFeeForBlock = await this.networkService.getBaseFeeForBlock();
    return Math.min(
      BigNumber.from(maxFeePerGas).toNumber(),
      BigNumber.from(maxPriorityFeePerGas).toNumber() + BigNumber.from(baseFeeForBlock).toNumber(),
    );
  }
}
