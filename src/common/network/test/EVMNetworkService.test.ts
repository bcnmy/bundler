import {
  Hex,
  TransactionReceiptNotFoundError,
  createPublicClient,
  custom,
} from "viem";
import { EVMNetworkService } from "../EVMNetworkService";
// import { ErrorCheckingTransactionReceipt } from "../errors";

// This file contains all of the test fixtures used in this test file.
// If you want to generate additional fixtures, you can use the fixture-generator.ts file,
// just make sure to change the constants in the file with your desired values.
import chains from "./fixtures.json";
import { ErrorCheckingTransactionReceipt } from "../errors";

// prevent 'TypeError: Do not know how to serialize a BigInt'
// eslint-disable-next-line func-names
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe("EVMNetworkService", () => {
  describe("waitForTransaction", () => {
    // const blockNumberFixture = "0x1"; // hardcode current block
    const mockRpc = jest.fn();

    const mockClient = createPublicClient({
      transport: custom({
        async request(req: any) {
          return mockRpc(req);
        },
      }),
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should timeout if the RPC is not responding (hanging)", async () => {
      const chain = chains[0];
      const fixture = chain.fixtures[0];
      const networkService = new EVMNetworkService({
        chainId: chain.chainId,
        client: mockClient,
      });

      // mock rpc hanging for 10s (timeout is <10s)
      mockRpc.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(fixture.transactionReceipt);
            }, 10_000);
          }),
      );

      await expect(
        networkService.waitForTransaction(
          fixture.transaction.hash as Hex,
          "whatever",
        ),
      ).rejects.toThrow(ErrorCheckingTransactionReceipt);

      expect(mockRpc).toHaveBeenCalledTimes(1);
    }, 10_000);

    it("should timeout if RPC throws errors", async () => {
      expect(mockRpc).toHaveBeenCalledTimes(0);

      const chain = chains[0];
      const fixture = chain.fixtures[0];
      const networkService = new EVMNetworkService({
        chainId: chain.chainId,
        client: mockClient,
      });

      mockRpc.mockRejectedValue(
        new TransactionReceiptNotFoundError({
          hash: fixture.transaction.hash as Hex,
        }),
      );

      await expect(
        networkService.waitForTransaction(
          fixture.transaction.hash as Hex,
          "whatever",
        ),
      ).rejects.toThrow(ErrorCheckingTransactionReceipt);

      expect(mockRpc.mock.calls.length).toBeGreaterThan(1);
    });

    it("should timeout if RPC returns null receipts", async () => {
      expect(mockRpc).toHaveBeenCalledTimes(0);

      const chain = chains[0];
      const fixture = chain.fixtures[0];
      const networkService = new EVMNetworkService({
        chainId: chain.chainId,
        client: mockClient,
      });

      mockRpc.mockResolvedValue(null);

      await expect(
        networkService.waitForTransaction(
          fixture.transaction.hash as Hex,
          "whatever",
        ),
      ).rejects.toThrow(ErrorCheckingTransactionReceipt);
    });

    describe.each(chains)("chainId: $chainId", (chain) => {
      const networkService = new EVMNetworkService({
        chainId: chain.chainId,
        client: mockClient,
      });

      describe("expected behavior", () => {
        it.each(chain.fixtures)(
          "txHash: $transaction.hash",
          async (fixture) => {
            // mock eth_getTransactionReceipt
            mockRpc.mockResolvedValueOnce(fixture.transactionReceipt);

            // make sure you don't pass empty strings for txHash because viem will just retry until timeout
            await expect(
              networkService.waitForTransaction(
                fixture.transaction.hash as Hex,
                "whatever",
              ),
            ).resolves.toEqual(fixture.transactionReceipt);
          },
          10_000, // set test timeout to 10s to make sure tests fail if stuck in a retry loop
        );
      });
    });
  });
});
