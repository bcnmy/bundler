/* eslint-disable max-classes-per-file */
import { RPCError } from "./errors";

export abstract class RPCResponse {
  constructor(
    public id = 1,
    public jsonrpc = "2.0",
  ) {}
}

export class RPCErrorResponse extends RPCResponse {
  constructor(
    public error: RPCError,
    requestId?: number,
  ) {
    super(requestId);
  }
}
