import { BUNDLER_VALIDATION_STATUSES } from "../../../../middleware";
import { RPCError } from "../shared/errors";

export class ChainIdNotSupportedError extends RPCError {
  constructor(chainId: string) {
    super(
      BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      `chainId: ${chainId} not supported by our Bundler`,
    );
  }
}
