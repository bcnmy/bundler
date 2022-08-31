export interface LooseObject {
  [key: string]: any
}

export interface IConfig {
  setup(): Boolean

  update(data: Object): Boolean

  get(): Object
}

enum CredentialType {
  SUPPORTED_NETWORKS,
  RELAYER_SERVICE,
  MONGO_URL,
}
