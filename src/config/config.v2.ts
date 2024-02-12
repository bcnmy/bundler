/* eslint-disable max-classes-per-file */
import config from "config";

export class ConfigV2 {
  enabledNetworks = config.get("enabledNetworks");

  networks: Networks = config.get("networks");
}

interface NetworkInfo {
  chainId: string;
  providers: IProvider[];
}

interface IProvider {
  name: string;
  rpcUrl: string;
}

type Network = Record<string, NetworkInfo>;
type Platform = Record<string, Network>;
type Networks = Record<string, Platform>;
