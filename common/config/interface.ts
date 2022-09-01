export interface LooseObject {
  [key: string]: any
}

export interface IConfig {
  setup(): boolean

  update(data: object): boolean

  get(): object
}

enum CredentialType {
  SUPPORTED_NETWORKS,
  RELAYER_SERVICE,
  MONGO_URL,
}
