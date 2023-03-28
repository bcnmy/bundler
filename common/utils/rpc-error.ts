export default class RpcError extends Error {
  constructor(
    msg: string,
    readonly code?: number,
    readonly data: any = undefined,
  ) {
    super(msg);
  }
}
