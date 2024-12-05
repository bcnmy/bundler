import config from "config";

/**
 * Smoke test to check if the server is running and healthy.
 * This can be run on a local environment or on a deployed environment.
 * If you're testing locally, make sure you have the server running before running this test.
 * If you want to target production, edit the SMOKE_TEST_BUNDLER_HOSTNAME environment variable in the .env file.
 *
 * To make sure smoke tests pass on a local environment you can use config/smoke.json
 * and disable funding & checking of relayers because you don't want to acrquire funds
 * for every mainnet & testnet we support.
 */
describe("smoke-test", () => {
  const bundlerHostname = process.env.SMOKE_TEST_BUNDLER_HOSTNAME;
  if (!bundlerHostname) {
    throw new Error("SMOKE_TEST_BUNDLER_HOSTNAME not set");
  }

  describe("health", () => {
    const supportedNetworks: number[] = config.get("supportedNetworks");

    console.log(`Smoke test target bundler: ${bundlerHostname}`);

    for (const chainId of supportedNetworks) {
      it(`/admin/health/${chainId}`, async () => {
        const expected = {
          chainId,
          healthy: true,
        };

        const response = await fetch(
          `${bundlerHostname}/admin/health/${chainId}`,
        );
        expect(response.status).toBe(200);

        const data = await response.json();

        expect(data).toMatchObject(expected);
      });
    }
  });
});
