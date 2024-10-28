export default class RpcError extends Error {
  constructor(
    msg: string,
    readonly code?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly data: any = undefined,
  ) {
    super(msg);
  }
}
