import type { CCMPMessage } from '../../common/types';

export interface ICCMPRouterService {
  handlePreVerification: (txhHash: string, message: CCMPMessage) => Promise<void>;
  getVerificationData: (txHash: string, message: CCMPMessage) => Promise<string | Uint8Array>;
}

export interface IIndexerTxData {
  txHash: string;
  gasUsage: number;
  chainId: number;
  from: string;
  scAddress: string;
  eventName: string;
  eventData: any;
}
