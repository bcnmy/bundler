import { createPublicClient, custom } from "viem";
import { EVMNetworkService } from "../EVMNetworkService";
import { ErrorCheckingTransactionReceipt } from "../errors";

// This file contains all of the test fixtures used in this test file.
// If you want to generate additional fixtures, you can use the fixture-generator.ts file,
// just make sure to change the constants in the file with your desired values.
import chains from "./fixtures.json";

// prevent 'TypeError: Do not know how to serialize a BigInt'
// eslint-disable-next-line func-names
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe("EVMNetworkService", () => {
  describe("waitForTransaction", () => {
    const blockNumberFixture = "0x1"; // hardcode current block

    describe.each(chains)("chainId: $chainId", (chain) => {
      const mockRpc = jest.fn();

      const mockClient = createPublicClient({
        transport: custom({
          async request(req: any) {
            return mockRpc(req);
          },
        }),
      });

      const networkService = new EVMNetworkService({
        chainId: chain.chainId,
        client: mockClient,
      });

      describe("expected behavior", () => {
        // 🚫 This is not written according to best practices because:
        // - it mocks and tests internal implementation details, instead just the behavior
        // - it's very "brittle", if one RPC call changes the test will fail until we update the mocking logic

        // 🔥 But it's still useful in this specific situation, since the EVMNetworkService is just a thin wrapper over viem.
        // With this test we make sure:
        // - we know how to mock viem in tests if necessary
        // - we make sure we understand the RPC calls viem makes in the background, and that it's not making any redundant RPC requests (or the mock would fail)
        it.each(chain.fixtures)(
          "txHash: $transaction.hash",
          async (fixture) => {
            mockRpc.mockResolvedValueOnce(blockNumberFixture);

            // mock eth_getTransactionByHash
            mockRpc.mockResolvedValueOnce(fixture.transaction);

            // mock eth_getTransactionReceipt
            mockRpc.mockResolvedValueOnce(fixture.transactionReceipt);

            // make sure you don't pass empty strings for txHash because viem will just retry until timeout
            await expect(
              networkService.waitForTransaction(
                fixture.transaction.hash,
                "whatever",
              ),
            ).resolves.toEqual(fixture.transactionReceipt);
          },
          10_000, // set test timeout to 10s to make sure tests fail if stuck in a retry loop
        );
      });

      describe("errors", () => {
        // 💡 This tests if we can handle ANY error coming from the RPC call. How?
        // Well the expected behaviour of viem is to retry no matter what happens, and then finnaly throw a timeout error,
        // so we check the error type and expect it to match our custom ErrorCheckingTransactionReceipt.
        // In case we forgot the try/catch or anything similar, it will fail because the error won't be wrapped with our custom type.
        it("should retry until timeout in case of an RPC error", async () => {
          // mock throw error in RPC call
          mockRpc.mockImplementationOnce(() => {
            throw new Error("RPC error");
          });

          await expect(
            networkService.waitForTransaction(
              chain.fixtures[0].transaction.hash,
              "whatever",
            ),
          ).rejects.toThrow(ErrorCheckingTransactionReceipt);
        }, 10_000); // set test timeout to 10s to make sure tests fail if stuck in a retry loop
      });
    });
  });
});
