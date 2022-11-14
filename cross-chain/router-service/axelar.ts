import type { ICCMPRouterService } from './interfaces';
import type { CCMPMessage } from '../../common/types';
import type { EVMNetworkService } from '../../common/network';

export class AxelarRouterService implements ICCMPRouterService {
  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService,
  ) {}

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  estimateVerificationCost(txHash: string, message: CCMPMessage): Promise<any> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  handlePreVerification(txhHash: string, message: CCMPMessage): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  getVerificationData(txHash: string, message: CCMPMessage): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
