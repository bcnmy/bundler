export interface IHealthService {
  checkRedis(): Promise<Boolean>;
  checkDB(): Promise<Boolean>;
  checkRabbitmq(): Promise<Boolean>;
  checkServer(): Promise<Boolean>;
  checkCoinMarketCap(): Promise<Boolean>;
  checkProviderUrl(): Promise<Boolean>;
}
