export interface LooseObject {
  [key: string]: any
}

export type NodeConfig = {
  slack: {
    token: string,
    channel: string,
  },
  datasources: {
    monog_url: string,
    redis_url: string,
  },
  socket_service: {
    wss_url: string,
    http_url: string,
    secret: string,
    api_key: string,
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
