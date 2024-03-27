import nodeconfig from "config";
import staticConfig from "./static-config.json";

describe("ConfigV2", () => {
  // We replaced static-config.json with config/default.json + moved some properties
  // so a test is required to test if we migrated everything correctly
  it("should contain everything that was in the old static-config.json", () => {
    // every property and it's value from the static config should be present in the new config,
    // except the ones that were added to default.json and don't exist in the old config
    const {
      // the following fields were added to the new config and don't exist in static-config.json
      polygonZKEvmNetworks,
      optimismNetworks,
      l2Networks,
      mantleNetworks,
      blastPvgValue,
      lineaNetworks,
      astarNetworks,
      arbitrumNetworks,
      alchemySimulateExecutionSupportedNetworks,
      scrollNetworks,
      pvgMarkUp,
      networksNotSupportingEthCallStateOverrides,
      networksNotSupportingEthCallBytecodeStateOverrides,
      ...oldConfigValues
    } = nodeconfig.util.toObject();

    // 'providers' property was added to the chain config so we need to ignore it when matching
    const { chains, ...configWithoutChains } = oldConfigValues;
    const { providers, ...chainsWithoutProviders } = chains;

    expect(staticConfig).toEqual(
      expect.objectContaining({
        ...configWithoutChains,
        chains: expect.objectContaining(chainsWithoutProviders),
      }),
    );
  });
});
