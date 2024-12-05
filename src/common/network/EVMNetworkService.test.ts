import { EVMNetworkService } from "./EVMNetworkService";

describe("EVMNetworkService", () => {
  // share fixture values for the test
  const chainId = 11155111;
  const rpcUrls = [
    "https://eth-sepolia.g.alchemy.com/v2/2d7XL_fP43hrJ6nMRVybXpK8Ocw5u1-b",
  ];
  const mevProtectedRpcUrl =
    "https://rpc-sepolia.flashbots.net/fast?url=https://eth-sepolia.g.alchemy.com/v2/2d7XL_fP43hrJ6nMRVybXpK8Ocw5u1-b";

  describe("constructor", () => {
    it("should initialize properly", () => {
      const networkService = new EVMNetworkService({
        chainId,
        rpcUrls,
        mevProtectedRpcUrl,
      });

      expect(networkService.chainId).toEqual(chainId);
      expect(networkService.rpcUrls).toEqual(rpcUrls);
      expect(networkService.mevProtectedRpcUrl).toEqual(mevProtectedRpcUrl);
    });

    it.todo("should construct with no parameters (use defaults)");
  });

  describe("toJSON", () => {
    const networkService = new EVMNetworkService({
      chainId,
      rpcUrls,
      mevProtectedRpcUrl,
    });

    it("should return the short JSON representation with API keys hidden", () => {
      expect(networkService.toJSON()).toEqual({
        chainId,
        rpcUrls: ["eth-sepolia.g.alchemy.com"],
        mevProtectedRpcUrl: "rpc-sepolia.flashbots.net",
        checkForReceiptIntervalMs: 1000,
        checkForReceiptTimeoutMs: 60000,
      });
    });
  });
});
