jest.mock('axios');

import { CMCTokenPriceManager } from '../../../common/token-price';
import { config } from '../../../config';
import { MockCache } from '../mocks/mockCache';

const axios = require('axios');

let symbol = "ETH";
const dummyTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

describe('CMCTokenPriceManager', () => {
    let cmcTokenPriceManager: CMCTokenPriceManager;
    let cacheService: MockCache;

    beforeAll(async () => {
        cacheService = new MockCache();

        // Create a mock instance of the class that contains the postMessage method
        cmcTokenPriceManager = new CMCTokenPriceManager(
            cacheService,
            {
                apiKey: 'dummy-api-key',
                networkSymbolCategories: config.tokenPrice.networkSymbols,
                updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
                symbolMapByChainId: {
                    "1": {
                        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH"
                    },
                },
            }
        );
    });

    afterEach(async () => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it('should call getTokenPrice and fetch the data from cache', async () => {
        let expectedTokenPrice = '1200'
        jest.spyOn(cacheService, 'get').mockReturnValueOnce(Promise.resolve(JSON.stringify({ [symbol]: expectedTokenPrice })));
        let tokenPrice = await cmcTokenPriceManager.getTokenPrice(symbol);
        expect(tokenPrice).toEqual(expectedTokenPrice);
    });

    it('should call getTokenPrice and fetch the data from network', async () => {
        let expectedTokenPrice = '1200'

        const mockFakeTodoItem = {
            "data": {
                "ETH": {
                    "id": 1027,
                    "name": "Ethereum",
                    "symbol": "ETH",
                    "quote": {
                        "USD": {
                            "price": 1200
                        }
                    }
                },
                "USDT": {
                    "id": 825,
                    "name": "Tether",
                    "symbol": "USDT",
                    "quote": {
                        "USD": {
                            "price": 1,
                        }
                    }
                }
            }
        }
        axios.get.mockReturnValue(mockFakeTodoItem);

        jest.spyOn(cacheService, 'get').mockReturnValue(Promise.resolve(JSON.stringify({ [symbol]: expectedTokenPrice })));

        let tokenPrice = await cmcTokenPriceManager.getTokenPrice(symbol);
        expect(tokenPrice).toEqual(expectedTokenPrice);
    });

    it('should call getTokenPrice and fetch the data from network', async () => {
        let expectedTokenPrice = '1200'

        jest.spyOn(cmcTokenPriceManager, 'getTokenPrice').mockReturnValueOnce(Promise.resolve(1200));

        let tokenPrice = await cmcTokenPriceManager.getTokenPriceByTokenAddress(1, dummyTokenAddress);
        expect(tokenPrice.toString()).toEqual(expectedTokenPrice);
    });
});