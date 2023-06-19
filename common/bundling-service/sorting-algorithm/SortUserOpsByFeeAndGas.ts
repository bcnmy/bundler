/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable class-methods-use-this */
import { BigNumber } from 'ethers';
import { UserOperationType } from '../../types';

export class SortUserOpsByFeeAndGas {
  constructor() {}

  sort(userOps: UserOperationType[]): UserOperationType[] {
    userOps.sort((userOp1: UserOperationType, userOp2: UserOperationType) => {
      const userOp1GasPrice = this.getUserOpGasPrice(userOp1);
      const userOp2GasPrice = this.getUserOpGasPrice(userOp2);

      if (userOp1GasPrice === userOp2GasPrice) {
        return BigNumber.from(
          userOp2.preVerificationGas,
        ).toNumber() - BigNumber.from(userOp1.preVerificationGas).toNumber();
      }
      return userOp2GasPrice - userOp1GasPrice;
    });

    // userOps.sort((userOp1: UserOperationType, userOp2: UserOperationType) => {
    //   const sender1 = userOp1.sender;
    //   const sender2 = userOp2.sender;
    //   if (sender1.toLowerCase() === sender2.toLowerCase()) {
    //     if (userOp1.nonce < userOp2.nonce) {
    //       return 0;
    //     }
    //     return 1;
    //   }
    //   return 0;
    // });
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
