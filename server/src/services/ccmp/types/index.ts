import { CCMPMessage } from '../../../../../common/types';

export interface ICCMPRouterService {
  handlePreVerification: (txhHash: string, message: CCMPMessage) => Promise<void>;
  getVerificationData: (txHash: string, message: CCMPMessage) => Promise<string | Uint8Array>;
}
