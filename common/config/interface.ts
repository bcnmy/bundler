export interface LooseObject {
  [key: string]: any
}

export type NodeConfig = {
  slack: {
    token: string,
    channel: string,
  },
  datasources: {
    mongoUrl: string,
    redisUrl: string,
  },
  socket_service: {
    wssUrl: string,
    httpUrl: string,
    secret: string,
    apiKey: string,
  },
  supported_networks: Array<number>,
  chains: {
    currency: {
      [key: number]: string,
    },
    decimal: {
      [key: number]: string,
    }
  }
};

export interface IConfig {
  setup(): void

  update(data: object): boolean

  get(): NodeConfig | null
}

enum CredentialType {
  SUPPORTED_NETWORKS,
  RELAYER_SERVICE,
  MONGO_URL,
}
