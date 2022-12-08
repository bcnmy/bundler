import type { ICCMPRouterService } from './interfaces';
import type { CCMPMessageType } from '../../../../../common/types';
import type { EVMNetworkService } from '../../../../../common/network';

export class AxelarRouterService implements ICCMPRouterService {
  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService,
  ) {}

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  estimateVerificationFeePaymentTxGas(txHash: string, message: CCMPMessageType): Promise<number> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  estimateVerificationFee(txHash: string, message: CCMPMessageType): Promise<any> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  handlePreVerification(txhHash: string, message: CCMPMessageType): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  getVerificationData(txHash: string, message: CCMPMessageType): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
