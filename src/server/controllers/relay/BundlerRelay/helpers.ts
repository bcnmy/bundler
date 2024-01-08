/* eslint-disable max-classes-per-file */
import { entryPointMap } from "../../../../common/service-manager";
import { EntryPointContractType } from "../../../../common/types";
import { parseError } from "../../../../common/utils";
import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";

export const tryFindEntrypoint = (
  chainId: number,
  entryPointAddress: string,
): EntryPointContractType | undefined => {
  const entryPointContracts = entryPointMap[chainId];

  let entryPointContract;
  for (
    let entryPointContractIndex = 0;
    entryPointContractIndex < entryPointContracts.length;
    entryPointContractIndex += 1
  ) {
    if (
      entryPointContracts[entryPointContractIndex].address.toLowerCase() ===
      entryPointAddress.toLowerCase()
    ) {
      entryPointContract =
        entryPointContracts[entryPointContractIndex].entryPointContract;
      break;
    }
  }
  if (!entryPointContract) {
    return undefined;
  }

  return entryPointContract;
};

export abstract class RPCResponse {
  constructor(
    public id = 1,
    public jsonprc = "2.0",
  ) {}
}

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
