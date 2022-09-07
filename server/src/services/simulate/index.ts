import { tenderlyService } from './tenderly-simulate';

interface ISimulate {
  tenderly: (data: string, wallet: string, refundInfo: any) => Promise<any>,
}

export class Simulate implements ISimulate {
  private chainId: number;

  tenderlyService = tenderlyService;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  async tenderly(data: string, wallet: string, refundInfo: any) {
    this.tenderlyService(wallet, data, this.chainId, refundInfo);
  }
}
