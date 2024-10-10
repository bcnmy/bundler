/* eslint-disable max-classes-per-file */

import { BUNDLER_ERROR_CODES } from "../../shared/middleware";
import { RPCError } from "../shared/errors";

export class EntryPointNotSupportedError extends RPCError {
  constructor(entryPointAddress: string) {
    super(
      BUNDLER_ERROR_CODES.BAD_REQUEST,
      `Entry point with entryPointAddress: ${entryPointAddress} not supported by the Bundler.
      Please make sure that the given entryPointAddress is correct`,
    );
  }
}

export class ChainIdNotSupportedError extends RPCError {
  constructor(chainId: string) {
    super(
      BUNDLER_ERROR_CODES.BAD_REQUEST,
      `Can't estimate user operations gas for chainId: ${chainId}.
      Please make sure that the chainId is correct and supported by our Bundler`,
    );
  }
}

export class GasPriceError extends RPCError {
  constructor(chainId: string) {
    super(
      BUNDLER_ERROR_CODES.BAD_REQUEST,
      `Don't know how to fetch gas price for chainId: ${chainId}.
      Please make sure that the chainId is correct and supported by our Bundler`,
    );
  }
}
