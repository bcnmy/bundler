export interface LooseObject {
  [key: string]: any
}

export interface IConfig {
  setup(): Boolean

  update(data: Object): Boolean

  getCredentials(): Object
}
