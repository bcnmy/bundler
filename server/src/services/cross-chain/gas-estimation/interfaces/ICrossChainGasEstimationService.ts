import { BigNumber } from 'ethers';
import type { CCMPMessageType } from '../../../../../../common/types';

export interface ICrossChainGasEstimationService {
  estimateCrossChainFee(
    txHash: string,
    message: CCMPMessageType
  ): Promise<{ amount: BigNumber; tokenSymbol: string }>;
}
