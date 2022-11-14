import { BigNumberish } from 'ethers';
import type { CCMPMessage } from '../../../common/types';

export interface ICCMPRouterService {
  handlePreVerification: (txHash: string, message: CCMPMessage) => Promise<void>;
  getVerificationData: (txHash: string, message: CCMPMessage) => Promise<string | Uint8Array>;
  estimateVerificationCost: (
    txHash: string,
    message: CCMPMessage
  ) => Promise<{ tokenSymbol: string; amount: BigNumberish }>;
}
