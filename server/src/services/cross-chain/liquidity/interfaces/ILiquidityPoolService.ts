import { CCMPMessagePayloadType, CCMPRouterName, CCMPMessageType } from '../../../../../../common/types';

export interface ILiquidityPoolService {
  generateDepositAndCallMessage(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string,
    receiverAddress: string,
    amountInWei: string,
    adaptorName: CCMPRouterName,
    payload: CCMPMessagePayloadType[]
  ): Promise<CCMPMessageType>;
}
