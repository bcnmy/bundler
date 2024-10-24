/* eslint-disable max-classes-per-file */
import { parseError } from "../../../../common/utils";
import { BUNDLER_ERROR_CODES } from "../../shared/middleware";

export class RPCError {
  constructor(
    public code = BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
    public message = "Internal Server Error",
  ) {}
}

export class InternalServerError extends RPCError {
  constructor(error: unknown) {
    super(
      BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
      `Internal Server Error: ${parseError(error)}`,
    );
  }
}

export class ChainIdNotSupportedError extends RPCError {
  constructor(chainId: string) {
    super(
      BUNDLER_ERROR_CODES.BAD_REQUEST,
      `chainId: ${chainId} not supported by the Bundler`,
    );
  }
}
