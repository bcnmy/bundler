export interface LooseObject {
  [key: string]: any
}

export type NodeConfig = {
  slack: {
    token: string,
    channel: string,
  },
};

export interface IConfig {
  setup(config: NodeConfig): void

  update(data: object): boolean

  get(): NodeConfig
}

enum CredentialType {
  SUPPORTED_NETWORKS,
  RELAYER_SERVICE,
  MONGO_URL,
}
