/* eslint-disable @typescript-eslint/indent */
import { ICacheService } from '../../../common/cache';
import { GasPriceManager, GasPriceServiceType } from '../../../common/gas-price';
import { GasPriceType } from '../../../common/gas-price/types';
import { EVMNetworkService } from '../../../common/network';
import { config } from '../../../config';
import { MockCache } from '../mocks/mockCache';
import { MockNetworkService } from '../mocks/mockNetworkService';

const chainId = 5;

describe('Transaction Service: Sending Transaction on chainId: 5', () => {
    let gasPriceManager;
    const gasPriceServiceMap: {
        [chainId: number]: GasPriceServiceType;
    } = {};

    let cacheService: MockCache | ICacheService;
    beforeAll(async () => {
        cacheService = new MockCache();
        const networkServiceMap: {
            [chainId: number]: EVMNetworkService;
        } = {};
        networkServiceMap[chainId] = new MockNetworkService({
            chainId,
            rpcUrl: config.chains.provider[chainId],
            fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
        });

        gasPriceManager = new GasPriceManager(cacheService, networkServiceMap[chainId], {
            chainId,
            EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
        });

        gasPriceServiceMap[chainId] = gasPriceManager.setup();
    });
    afterEach(async () => {
        jest.resetAllMocks();
    });

    it(`should update gas price in redis for chainId: ${chainId}`, async () => {
        await gasPriceServiceMap[chainId]?.setGasPrice(GasPriceType.DEFAULT, '1000000000');
    });

    it(`should get gas price from redis for chainId: ${chainId}`, async () => {
        const gasPrice = await gasPriceServiceMap[chainId]?.getGasPrice(GasPriceType.DEFAULT);
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('1000000000');
    });

    it(`should get GasPrice from cache while calling getGasPriceForSimulation for chainId: ${chainId}`, async () => {
        const gasPrice = await gasPriceServiceMap[chainId]?.getGasPriceForSimulation(
            GasPriceType.DEFAULT,
        );
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('1000000000');
    });

    it(`should get GasPrice from Network while calling getGasPriceForSimulation for chainId: ${chainId}`, async () => {
        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(''));
        const gasPrice = await gasPriceServiceMap[chainId]?.getGasPriceForSimulation(
            GasPriceType.DEFAULT,
        );
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('1000000000');
    });
});
