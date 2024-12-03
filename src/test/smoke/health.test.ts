import fs from "fs";

describe("smoke-test", () => {
  describe("health", () => {
    // get supported networks from development.json
    const developmentJson = fs.readFileSync("config/default.json", "utf8");
    const parsed = JSON.parse(developmentJson);
    const supportedNetworks: number[] = parsed.supportedNetworks;

    for (const chainId of supportedNetworks) {
      it(`/admin/health/${chainId}`, async () => {
        const expected = {
          chainId,
          healthy: true,
        };

        const response = await fetch(
          `http://localhost:3000/admin/health/${chainId}`,
        );
        expect(response.status).toBe(200);

        const data = JSON.parse(await response.json());

        expect(data).toMatchObject(expected);
      });
    }
  });
});
