/* eslint-disable max-classes-per-file */
import { parseError } from "../../../../common/utils";
import { BUNDLER_VALIDATION_STATUSES } from "../../shared/middleware";

export class RPCError {
  constructor(
    public code = BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    public message = "Internal Server Error",
  ) {}
}

export class InternalServerError extends RPCError {
  constructor(error: unknown) {
    super(
      BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
      `Internal Server Error: ${parseError(error)}`,
    );
  }
}
