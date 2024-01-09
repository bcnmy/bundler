import { parseError } from "../../../../common/utils";
import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";
import { RPCResponse } from "./RPCResponse";

export class RPCInternalServerError extends RPCResponse {
  public error: {
    code: number;
    message: string;
  };

  constructor(
    public id: number,
    err: any,
  ) {
    super(id);
    this.error = {
      code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
      message: `Internal Server error: ${parseError(err)}`,
    };
  }
}
