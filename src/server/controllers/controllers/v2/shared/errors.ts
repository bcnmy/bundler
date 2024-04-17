import { BUNDLER_VALIDATION_STATUSES } from "../../../../middleware";

export class RPCError {
  constructor(
    public code = BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    public message = "Internal Server Error",
  ) {}
}
