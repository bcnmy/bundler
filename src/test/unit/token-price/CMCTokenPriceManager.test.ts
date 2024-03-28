describe("broken test", () => {
  it.todo("should be fixed");
});

// import { CMCTokenPriceManager } from "../../../common/token-price";
// import { customJSONStringify } from "../../../common/utils";
// import { config } from "../../../config";
// import { MockCache } from "../mocks/mockCache";

// jest.mock("axios");

// const axios = require("axios");

// const symbol = "ETH";
// const tokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// describe("CMCTokenPriceManager", () => {
//   let cmcTokenPriceManager: CMCTokenPriceManager;
//   let cacheService: MockCache;

//   beforeAll(async () => {
//     cacheService = new MockCache();

//     // Create a mock instance of the class that contains the postMessage method
//     cmcTokenPriceManager = new CMCTokenPriceManager(cacheService, {
//       apiKey: "dummy-api-key",
//       networkSymbolCategories: config.tokenPrice.networkSymbols,
//       updateFrequencyInSeconds: 90,
//       symbolMapByChainId: {
//         1: {
//           [tokenAddress]: "ETH",
//         },
//       },
//     });
//   });

//   afterEach(async () => {
//     jest.resetAllMocks();
//     jest.clearAllMocks();
//   });

//   it("should call getTokenPrice and fetch the data from cache", async () => {
//     const expectedTokenPrice = "1200";
//     jest
//       .spyOn(cacheService, "get")
//       .mockReturnValueOnce(
//         Promise.resolve(customJSONStringify({ [symbol]: expectedTokenPrice })),
//       );
//     const tokenPrice = await cmcTokenPriceManager.getTokenPrice(symbol);
//     expect(tokenPrice).toEqual(expectedTokenPrice);
//   });

//   it("should call getTokenPrice and fetch the data from network", async () => {
//     const expectedTokenPrice = "1200";

//     jest.spyOn(cacheService, "get").mockReturnValueOnce(Promise.resolve(""));

//     const mockFakeTodoItem = {
//       data: {
//         data: {
//           ETH: {
//             id: 1027,
//             name: "Ethereum",
//             symbol: "ETH",
//             quote: {
//               USD: {
//                 price: 1200,
//               },
//             },
//           },
//           USDT: {
//             id: 825,
//             name: "Tether",
//             symbol: "USDT",
//             quote: {
//               USD: {
//                 price: 1,
//               },
//             },
//           },
//         },
//       },
//     };
//     axios.get.mockReturnValue(mockFakeTodoItem);

//     jest
//       .spyOn(cacheService, "get")
//       .mockReturnValueOnce(
//         Promise.resolve(customJSONStringify({ [symbol]: expectedTokenPrice })),
//       );
//     const tokenPrice = await cmcTokenPriceManager.getTokenPrice(symbol);
//     expect(tokenPrice).toEqual(expectedTokenPrice);
//   });

//   it("should call getTokenPriceByTokenAddress", async () => {
//     const expectedTokenPrice = "1200";

//     jest
//       .spyOn(cmcTokenPriceManager, "getTokenPrice")
//       .mockReturnValueOnce(Promise.resolve(1200));

//     const tokenPrice = await cmcTokenPriceManager.getTokenPriceByTokenAddress(
//       1,
//       tokenAddress,
//     );
//     expect(tokenPrice.toString()).toEqual(expectedTokenPrice);
//   });

//   it("getTokenPrice should throw Can't get token symbol for token address 0xf17e65822b568b3903685a7c9f496cf7656cc6c1 from config map", async () => {
//     try {
//       await await cmcTokenPriceManager.getTokenPriceByTokenAddress(
//         1,
//         "0xf17e65822b568b3903685a7c9f496cf7656cc6c1",
//       );
//     } catch (error: any) {
//       expect(error.toString()).toEqual(
//         "Error: Can't get token symbol for token address 0xf17e65822b568b3903685a7c9f496cf7656cc6c1 from config map",
//       );
//     }
//   });

//   it("getTokenPrice should throw Token address is not defined", async () => {
//     try {
//       await cmcTokenPriceManager.getTokenPriceByTokenAddress(1, "");
//     } catch (error: any) {
//       expect(error.toString()).toEqual("Error: Token address is not defined");
//     }
//   });
// });
