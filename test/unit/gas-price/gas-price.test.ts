/* eslint-disable @typescript-eslint/indent */
import { ethers } from 'ethers';
import { ICacheService } from '../../../common/cache';
import { GasPriceManager, GasPriceServiceType } from '../../../common/gas-price';
import { GasPriceType } from '../../../common/gas-price/types';
import { EVMNetworkService } from '../../../common/network';
import { config } from '../../../config';
import { MockCache } from '../mocks/mockCache';
import { MockNetworkService } from '../mocks/mockNetworkService';

const goerli = 5;
const mumbai = 80001; // to test eip1559 supported networks

describe('Transaction Service: Sending Transaction on chainId: 5', () => {
    let gasPriceManagerGoerli;
    let gasPriceManagerMumbai;
    const gasPriceServiceMap: {
        [chainId: number]: GasPriceServiceType;
    } = {};

    let cacheService: MockCache;
    beforeAll(async () => {
        cacheService = new MockCache();
        const networkServiceMap: {
            [chainId: number]: EVMNetworkService;
        } = {};
        networkServiceMap[goerli] = new MockNetworkService({
            goerli,
            rpcUrl: config.chains.provider[goerli],
            fallbackRpcUrls: config.chains.fallbackUrls[goerli] || [],
        });

        gasPriceManagerGoerli = new GasPriceManager(cacheService, networkServiceMap[goerli], {
            chainId: goerli,
            EIP1559SupportedNetworks: [],
        });

        gasPriceServiceMap[goerli] = gasPriceManagerGoerli.setup();

        networkServiceMap[mumbai] = new MockNetworkService({
            mumbai,
            rpcUrl: config.chains.provider[mumbai],
            fallbackRpcUrls: config.chains.fallbackUrls[mumbai] || [],
        });
        gasPriceManagerMumbai = new GasPriceManager(cacheService, networkServiceMap[goerli], {
            chainId: mumbai,
            EIP1559SupportedNetworks: [80001],
        });
        gasPriceServiceMap[mumbai] = gasPriceManagerMumbai.setup();
    });
    afterEach(async () => {
        jest.resetAllMocks();
    });

    it(`should update gas price in redis for chainId: ${goerli}, if type is STRING`, async () => {
        await gasPriceServiceMap[goerli]?.setGasPrice(GasPriceType.DEFAULT, '1000000000');
    });

    it(`should update gas price in redis for chainId: ${goerli}, if type is not STRING`, async () => {
        await gasPriceServiceMap[goerli]?.setGasPrice(GasPriceType.DEFAULT, {
            maxPriorityFeePerGas: '100000000',
            maxFeePerGas: '1000000000',
        });
    });

    it(`should update gas price in redis for chainId: ${goerli}`, async () => {
        await gasPriceServiceMap[goerli]?.setGasPrice(GasPriceType.DEFAULT, '1000000000');
    });

    it(`should get gas price from redis for chainId: ${goerli}`, async () => {
        const gasPrice = await gasPriceServiceMap[goerli]?.getGasPrice(GasPriceType.DEFAULT);
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('1000000000');
    });

    it('should get gas price from redis for eip1559 supported chains', async () => {
        const expectedOutput = { maxFeePerGas: '1000000000', maxPriorityFeePerGas: '1000000000' };

        const gasPrice = await gasPriceServiceMap[mumbai]?.getGasPrice(GasPriceType.DEFAULT);
        expect(gasPrice).not.toBeUndefined();
        expect(typeof gasPrice).toBe('object');
        expect(JSON.stringify(gasPrice)).toBe(JSON.stringify(expectedOutput));
    });

    it(`should get gas price from Network for chainId: ${goerli}`, async () => {
        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(''));
        const gasPrice = await gasPriceServiceMap[goerli]?.getGasPrice(GasPriceType.DEFAULT);
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('20000000');
    });

    it('should get gas price from network for eip1559 supported chains', async () => {
        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(''));

        const expectedOutput = {
            maxFeePerGas: '20000000',
            maxPriorityFeePerGas: '20000000',
        };

        const gasPrice = await gasPriceServiceMap[mumbai]?.getGasPrice(GasPriceType.DEFAULT);
        expect(gasPrice).not.toBeUndefined();
        expect(typeof gasPrice).toBe('object');
        expect(JSON.stringify(gasPrice)).toBe(JSON.stringify(expectedOutput));
    });

    it(`should get GasPrice from CACHE while calling getGasPriceForSimulation for chainId: ${goerli}`, async () => {
        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve('1000000000'));
        const gasPrice = await gasPriceServiceMap[goerli]?.getGasPriceForSimulation(
            GasPriceType.DEFAULT,
        );
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('1000000000');
    });

    it(`should get GasPrice from NETWORK while calling getGasPriceForSimulation for chainId: ${goerli}`, async () => {
        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(''));
        const gasPrice = await gasPriceServiceMap[goerli]?.getGasPriceForSimulation(
            GasPriceType.DEFAULT,
        );
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe('20000000');
    });

    it(`should call getBumpedUpGasPrice for non-eip1559 transaction with bumpup % < 1.1 for chainId: ${goerli}`, async () => {
        const pastGasPrice = '20000000';
        const bumpingPercentage = 9;
        const gasPrice = await gasPriceServiceMap[goerli]?.getBumpedUpGasPrice(
            pastGasPrice,
            bumpingPercentage,
        );

        const resubmitGasPrice = 1.1 * Number(pastGasPrice);
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe(ethers.BigNumber.from(resubmitGasPrice)._hex);
    });

    it(`should call getBumpedUpGasPrice for non-eip1559 transaction with bumpup % > 1.1 for chainId: ${goerli}`, async () => {
        const pastGasPrice = '20000000';
        const bumpingPercentage = 20;
        const gasPrice = await gasPriceServiceMap[goerli]?.getBumpedUpGasPrice(
            pastGasPrice,
            bumpingPercentage,
        );

        const resubmitGasPrice = ethers.utils.hexValue(
            ethers.BigNumber.from(pastGasPrice)
                .mul(bumpingPercentage + 100)
                .div(100),
        );
        expect(gasPrice).not.toBeNull();
        expect(typeof gasPrice).toBe('string');
        expect(Number(gasPrice)).toBeGreaterThan(0);
        expect(gasPrice).toBe(ethers.BigNumber.from(resubmitGasPrice)._hex);
    });

    it(`should call getBumpedUpGasPrice for eip1559 transaction with bumpup % > 1.1 for chainId: ${goerli}`, async () => {
        const pastGasPrice = {
            maxFeePerGas: '1000000000',
            maxPriorityFeePerGas: '1000000000',
        };
        const bumpingPercentage = 20;
        const gasPrice = await gasPriceServiceMap[mumbai]?.getBumpedUpGasPrice(
            pastGasPrice,
            bumpingPercentage,
        );

        const bumpedUpMaxPriorityFeePerGas = ethers.utils.hexValue(
            ethers.BigNumber.from(pastGasPrice.maxPriorityFeePerGas)
                .mul(bumpingPercentage + 100)
                .div(100),
        );

        const bumpedUpMaxFeePerGas = ethers.utils.hexValue(
            ethers.BigNumber.from(pastGasPrice.maxFeePerGas)
                .mul(bumpingPercentage + 100)
                .div(100),
        );

        const expectedGasPrice = {
            maxFeePerGas: bumpedUpMaxFeePerGas,
            maxPriorityFeePerGas:
                bumpedUpMaxPriorityFeePerGas,
        };

        expect(gasPrice).not.toBeUndefined();
        expect(typeof gasPrice).toBe('object');
        expect(JSON.stringify(gasPrice)).toBe(JSON.stringify(expectedGasPrice));
    });

    it(`should call getBumpedUpGasPrice for eip1559 transaction with bumpup % < 1.1 for chainId: ${goerli}`, async () => {
        const pastGasPrice = {
            maxFeePerGas: '1000000000',
            maxPriorityFeePerGas: '1000000000',
        };
        const bumpingPercentage = 9;
        const gasPrice = await gasPriceServiceMap[mumbai]?.getBumpedUpGasPrice(
            pastGasPrice,
            bumpingPercentage,
        );

        const expectedGasPrice = {
            maxFeePerGas: ethers.BigNumber.from((
                Number(pastGasPrice.maxFeePerGas) * 1.11
            ).toString()).toHexString(),
            maxPriorityFeePerGas: ethers.BigNumber.from((
                Number(pastGasPrice.maxPriorityFeePerGas) * 1.11
            ).toString()).toHexString(),
        };

        expect(gasPrice).not.toBeUndefined();
        expect(typeof gasPrice).toBe('object');
        expect(JSON.stringify(gasPrice)).toBe(JSON.stringify(expectedGasPrice));
    });

    it(`should set setMaxFeeGasPrice price in redis for chainId: ${goerli}, if type is STRING`, async () => {
        const maxFeePerGas = '20000';
        await gasPriceServiceMap[goerli]?.setMaxFeeGasPrice(GasPriceType.DEFAULT, maxFeePerGas);

        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(maxFeePerGas));
        const getMaxFeeFas = await gasPriceServiceMap[goerli]?.getMaxFeeGasPrice(
            GasPriceType.DEFAULT,
        );

        expect(getMaxFeeFas).toBe(maxFeePerGas);
    });
});
