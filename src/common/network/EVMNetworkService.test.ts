import { EVMNetworkService } from "./EVMNetworkService";

describe("EVMNetworkService", () => {
  const networkService = new EVMNetworkService({ chainId: 80001, rpcUrl: "" });

  describe("waitForTransaction", () => {
    // this test was added while working on a bugfix where our Bundler was crashing, because of an unhandled promise rejection
    it("should handle unrecoverable network errors without crashing or retrying", async () => {
      expect(networkService).toBeDefined();

      expect(networkService.waitForTransaction("", "")).rejects.toContain(
        "ECONNREFUSED", // we are using a fake URL so this should throw ECONNREFUSED
      );
    }, 5000); // set a timeout of 5 seconds, because this should fail immediately without retrying
  });
});
