import type { CCMPMessage } from '../../types';

export interface ISDKBackendService {
  estimateCrossChainMessageGas: (message: CCMPMessage) => Promise<{
    gas: number;
    txBaseGas: number;
  }>;
}
