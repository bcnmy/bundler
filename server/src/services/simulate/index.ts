import { TenderlySimulation } from './tenderly';

interface ISimulate {
  execute: (data: string, wallet: string, refundInfo: any) => Promise<any>,
  updateSimulator: (provider: string) => any,
}

export class Simulate implements ISimulate {
  private simulator: any;

  constructor(provider: string) {
    this.updateSimulator(provider);
  }

  updateSimulator(provider: string) {
    if (provider === 'anyother') {
      this.simulator = new AnyOther();
    } else {
      this.simulator = new TenderlySimulation();
    }
  }

  async execute(data: string, wallet: string, refundInfo: any) {
    await this.simulator.simulateTransaction(data, wallet, refundInfo);
  }

  async tenderly() {

  }

  async blocknative() {
    
  }
}


const simulate = new Simulate();
simulate.execute();