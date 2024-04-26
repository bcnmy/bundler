import { BUNDLER_ERROR_CODES } from "../../shared/middleware";
import { RPCError } from "../shared/errors";

export class ChainIdNotSupportedError extends RPCError {
  constructor(chainId: string) {
    super(
      BUNDLER_ERROR_CODES.BAD_REQUEST,
      `chainId: ${chainId} not supported by our Bundler`,
    );
  }
}
