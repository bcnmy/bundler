// /* eslint-disable max-len */
// /* eslint-disable class-methods-use-this */
//
// import { extend } from 'lodash';
// import { ICacheService } from '../../../common/cache';
// import { IGasPriceService } from '../../../common/gas-price';
// import { GasPriceType } from '../../../common/gas-price/types';
// import { INetworkService } from '../../../common/network';
// import { TenderlySimulationService } from '../../../common/simulation/external-simulation';
// import { IExternalSimulation } from '../../../common/simulation/interface';
// import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../../../common/types';
// import { IEVMAccount } from '../../../relayer/src/services/account';
// import { MockCache } from './mockCache';
// import { MockNetworkService } from './mockNetworkService';

// export class MockGasPrice implements IGasPriceService {
//   chainId: number = 5;

//   networkService: INetworkService<IEVMAccount, EVMRawTransactionType> = new MockNetworkService({});

//   cacheService: ICacheService = new MockCache();

//   setGasPrice(gasType: GasPriceType, price: string): Promise<void> {
//     throw new Error('Method not implemented.');
//   }

//   getGasPrice(gasType?: GasPriceType | undefined): Promise<NetworkBasedGasPriceType> {
//     throw new Error('Method not implemented.');
//   }

//   getGasPriceForSimulation(gasType?: GasPriceType | undefined): Promise<string> {
//     throw new Error('Method not implemented.');
//   }

//   setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void> {
//     throw new Error('Method not implemented.');
//   }

//   getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
//     throw new Error('Method not implemented.');
//   }

//   setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void> {
//     throw new Error('Method not implemented.');
//   }

//   getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
//     throw new Error('Method not implemented.');
//   }

//   getBumpedUpGasPrice(pastGasPrice: NetworkBasedGasPriceType, bumpingPercentage: number): NetworkBasedGasPriceType {
//     throw new Error('Method not implemented.');
//   }
// }
