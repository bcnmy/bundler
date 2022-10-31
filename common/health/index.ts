// add health check for providers
// check if cmc key is expired
// check if gas price oracle is working
// get all relayers and their status

import { IHealthService } from './interface';

class HealthService implements IHealthService {

  constructor(cache) {

  }
  checkRedis(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }

  checkDB(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }

  checkRabbitmq(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }

  checkServer(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }

  checkCoinMarketCap(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }

  checkProviderUrl(): Promise<Boolean> {
    throw new Error('Method not implemented.');
  }
}
