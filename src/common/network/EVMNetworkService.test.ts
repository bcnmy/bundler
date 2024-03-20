import { createPublicClient, custom } from "viem";
import { EVMNetworkService } from "./EVMNetworkService";
import { ErrorCheckingTransactionReceipt } from "./errors";

describe("EVMNetworkService", () => {
  describe("waitForTransaction", () => {
    const chainIdFixture = 80001;

    const txHashFixture =
      "0x0a5e10aa005b0c6b8d934309c70e49f484e6f99d00c5f20f70647bd64bd123e2";

    const blockNumberFixture = "0x1";

    const transactionFixture = {
      blockHash:
        "0xb1112ef37861f39ff395a245eb962791e11eae26f94b50bb95e3e31378ef3d25",
      blockNumber: blockNumberFixture,
      from: "0x2d218ce7d8892fc6b391b614f84278d12decae52",
      gas: "0xf478",
      gasPrice: "0x5bcdcacee",
      maxFeePerGas: "0x645a4b0a6",
      maxPriorityFeePerGas: "0x173eed80",
      hash: txHashFixture,
      input:
        "0xa9059cbb000000000000000000000000b6ae07829376a5b704bb46a0869f383555097c29000000000000000000000000000000000000000000000034df6db862352c72d0",
      nonce: "0x2768",
      to: "0x111111517e4929d3dcbdfa7cce55d30d4b6bc4d6",
      transactionIndex: "0xb4",
      value: "0x0",
      type: "0x2",
      accessList: [],
      chainId: "0x1",
      v: "0x1",
      r: "0x4dec2c2ab964f28385d31cd203fe5960e001ccd110db816ad462d411cf496548",
      s: "0x62ffcab5b6ae1cf4a59d32dd39a92f14eadea5fbbb7587c1a845a3d0d8621253",
      yParity: "0x1",
    };

    const transactionReceiptFixture = {
      blockHash:
        "0xa957d47df264a31badc3ae823e10ac1d444b098d9b73d204c40426e57f47e8c3",
      blockNumber: blockNumberFixture,
      contractAddress: null,
      cumulativeGasUsed: "0xa12515",
      effectiveGasPrice: "0x5a9c688d4",
      from: "0x6221a9c005f6e47eb398fd867784cacfdcfff4e7",
      gasUsed: "0xb4c8",
      logs: [
        {
          address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          topics: [
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
            "0x0000000000000000000000006221a9c005f6e47eb398fd867784cacfdcfff4e7",
            "0x0000000000000000000000001e0049783f008a0085193e00003d00cd54003c71",
          ],
          data: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          blockNumber: "0xeff35f",
          transactionHash:
            "0x85d995eba9763907fdf35cd2034144dd9d53ce32cbec21349d4b12823c6860c5",
          transactionIndex: "0x66",
          blockHash:
            "0xa957d47df264a31badc3ae823e10ac1d444b098d9b73d204c40426e57f47e8c3",
          logIndex: "0xfa",
          removed: false,
        },
      ],
      logsBloom:
        "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000080000000000000000200000000000000000000020000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020001000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000010200000000000000000000000000000000000000000000000000000020000",
      status: "0x1",
      to: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      transactionHash: txHashFixture,
      transactionIndex: "0x66",
      type: "0x2",
    };

    const mockRpc = jest.fn();

    const mockClient = createPublicClient({
      transport: custom({
        async request(req: any) {
          return mockRpc(req);
        },
      }),
    });

    const networkService = new EVMNetworkService({
      chainId: chainIdFixture,
      client: mockClient,
    });

    afterAll(async () => {
      jest.restoreAllMocks();
    });

    // 🚫 This is not written according to best practices because:
    // - it mocks and tests internal implementation details, instead just the behavior
    // - it's very "brittle", if one RPC call changes the test will fail until we update the mocking logic

    // 🔥 But it's still useful in this specific situation, since the EVMNetworkService is just a thin wrapper over viem.
    // With this test we make sure:
    // - we know how to mock viem in tests if necessary
    // - we make sure we understand the RPC calls viem makes in the background, and that it's not making any redundant RPC requests (or the mock would fail)
    it("happy path", async () => {
      // mock eth_blockNumber
      mockRpc.mockResolvedValueOnce(blockNumberFixture);

      // mock eth_getTransactionByHash
      mockRpc.mockResolvedValueOnce(transactionFixture);

      // mock eth_getTransactionReceipt
      mockRpc.mockResolvedValueOnce(transactionReceiptFixture);

      // make sure you don't pass empty strings for txHash because viem will just retry until timeout
      const response = await networkService.waitForTransaction(
        txHashFixture,
        "whatever",
      );

      expect(response.transactionHash).toEqual(
        transactionReceiptFixture.transactionHash,
      );
    }, 10_000); // set test timeout to 10s to make sure tests fail if stuck in a retry loop

    // This tests if we can handle ANY error coming from the RPC call. How?
    // Well the expected behaviour of viem is to retry no matter what happens, and then finnaly throw a timeout error,
    // so we check the error type and expect it to match our custom ErrorCheckingTransactionReceipt.
    // In case we forgot the try/catch or anything similar, it will fail because the error won't be wrapped with our custom type.
    it("should retry until timeout in case of an RPC error", async () => {
      // mock throw error in RPC call
      mockRpc.mockImplementationOnce(() => {
        throw new Error("RPC error");
      });

      await expect(
        networkService.waitForTransaction(txHashFixture, "whatever"),
      ).rejects.toThrow(ErrorCheckingTransactionReceipt);
    }, 10_000); // set test timeout to 10s to make sure tests fail if stuck in a retry loop
  });
});
