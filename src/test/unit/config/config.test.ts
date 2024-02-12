import { merge } from "../../../config";
import { ConfigV2 } from "../../../config/config.v2";

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

describe("config.v2", () => {
  it("should load", () => {
    const config = new ConfigV2();

    console.log(config);
    expect(config.enabledNetworks).not.toHaveLength(0);

    console.log(config.networks.ethereum);
  });
});
