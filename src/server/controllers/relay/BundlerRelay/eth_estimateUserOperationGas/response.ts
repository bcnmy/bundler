/* eslint-disable max-classes-per-file */
import { JsonRpcError } from "./errors";

abstract class RPCResponse {
  constructor(
    public jsonrpc = "2.0",
    public id = 1,
  ) {}
}

export class RPCErrorResponse extends RPCResponse {
  constructor(public error: JsonRpcError) {
    super();
  }
}

export class EstimateUserOperationGasResponse extends RPCResponse {
  constructor(
    public result = {
      callGasLimit: 0,
      verificationGasLimit: 0,
      preVerificationGas: 0,
      validUntil: "0x0",
      validAfter: "0x0",
      maxPriorityFeePerGas: "0",
      maxFeePerGas: "0",
    },
  ) {
    super();
  }
}
