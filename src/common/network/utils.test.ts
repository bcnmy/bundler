import { hideRpcUrlApiKey } from "./utils";

describe("network/utils", () => {
  describe("hideApiKey", () => {
    // These are not actual API keys, just random strings, but the hostnames are real
    const testCases = [
      {
        name: "private",
        rpcUrl:
          "https://eth-sepolia.g.alchemy.com/v2/2d7XL_fP43hrJ6nMRVybXpK8Ocw5u1-b",
        expected: "eth-sepolia.g.alchemy.com",
      },
      {
        name: "flashbots",
        rpcUrl:
          "https://rpc-sepolia.flashbots.net/fast?url=https://eth-sepolia.g.alchemy.com/v2/4a8YU_sH56pkD2tPLWyqLvB9Jtq8j2-m",
        expected: "rpc-sepolia.flashbots.net",
      },
      // public RPC URLs should not have an API key, edge case
      {
        name: "public",
        rpcUrl: "https://rpc-quicknode-holesky.morphl2.io",
        expected: "rpc-quicknode-holesky.morphl2.io",
      },
    ];

    for (const { name, rpcUrl, expected } of testCases) {
      it(`should hide the API key for a ${name} RPC URL`, () => {
        expect(hideRpcUrlApiKey(rpcUrl)).toEqual(expected);
      });
    }
  });
});
