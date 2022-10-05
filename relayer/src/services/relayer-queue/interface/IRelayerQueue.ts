export interface IRelayerQueue<RelayerMetaDataType> {
  items: Array<RelayerMetaDataType>
  list(): Array<RelayerMetaDataType>
  pop(): Promise<RelayerMetaDataType | undefined>
  push(item: RelayerMetaDataType): Promise<void>
  size(): number
}
