import { merge } from "../../../config";

describe("merge configs", () => {
  it("should pick supportedNetworks from user config instead of static-config", () => {
    const userConfig = {
      supportedNetworks: [1],
    };
    const staticConfig = {
      supportedNetworks: [1, 2, 3],
    };

    const mergedConfig = merge(userConfig, staticConfig);

    expect(mergedConfig).toEqual(userConfig);
  });

  it("shouldn't pick supportedNetworks from user config if it's not present", () => {
    const userConfig = {};
    const staticConfig = {
      supportedNetworks: [1, 2, 3],
    };

    const mergedConfig = merge(userConfig, staticConfig);

    expect(mergedConfig).toEqual(staticConfig);
  });
});
