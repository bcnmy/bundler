import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";
import { RPCResponse } from "./RPCResponse";

export class RPCBadRequest extends RPCResponse {
  public error: {
    code: number;
    message: string;
  };

  constructor(
    public id: number,
    message: string,
  ) {
    super(id);
    this.error = {
      code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      message,
    };
  }
}
