/* eslint-disable max-classes-per-file */

import { parseError } from "../../../../../common/utils";
import { BUNDLER_VALIDATION_STATUSES } from "../../../../middleware";

export class JsonRpcError {
  constructor(
    public code = BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    public message = "Internal Server Error",
  ) {}
}

export class InternalServerError extends JsonRpcError {
  constructor(error: unknown) {
    super(
      BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
      `Internal Server Error: ${parseError(error)}`,
    );
  }
}

export class EntryPointNotSupportedError extends JsonRpcError {
  constructor(entryPointAddress: string) {
    super(
      BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      `Entry point with entryPointAddress: ${entryPointAddress} not supported by our Bundler.
      Please make sure that the given entryPointAddress is correct`,
    );
  }
}

export class ChainIdNotSupportedError extends JsonRpcError {
  constructor(chainId: string) {
    super(
      BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      `Can't estimate user operations gas for chainId: ${chainId}.
      Please make sure that the chainId is correct and supported by our Bundler`,
    );
  }
}

export class GasPriceError extends JsonRpcError {
  constructor(chainId: string) {
    super(
      BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      `Don't know how to fetch gas price for chainId: ${chainId}.
      Please make sure that the chainId is correct and supported by our Bundler`,
    );
  }
}
