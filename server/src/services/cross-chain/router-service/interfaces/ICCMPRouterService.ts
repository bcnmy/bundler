import { BigNumberish } from 'ethers';
import type { CCMPMessageType } from '../../../../../../common/types';

export interface ICCMPRouterService {
  handlePreVerification: (txHash: string, message: CCMPMessageType) => Promise<void>;
  getVerificationData: (txHash: string, message: CCMPMessageType) => Promise<string | Uint8Array>;
  estimateVerificationFee: (
    txHash: string,
    message: CCMPMessageType
  ) => Promise<{ amount: BigNumberish; tokenSymbol: string }>;
  estimateVerificationFeePaymentTxGas: (
    txHash: string,
    message: CCMPMessageType
  ) => Promise<number>;
}
