import { Hex } from "viem";
import { RPCResponse } from "../shared/response";

export class ChainIdResponse extends RPCResponse {
  constructor(
    public result: Hex,
    requestId?: number,
  ) {
    super(requestId);
  }
}
