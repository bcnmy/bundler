import { BigNumber } from 'ethers';
import type { CCMPMessage } from '../../../../../../common/types';

export interface ICrossChainGasEstimationService {
  estimateCrossChainFee(
    txHash: string,
    message: CCMPMessage
  ): Promise<{ amount: BigNumber; tokenSymbol: string }>;
}
