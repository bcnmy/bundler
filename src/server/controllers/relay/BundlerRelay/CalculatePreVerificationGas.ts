/* eslint-disable max-classes-per-file */
/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { STATUSES } from "../../../middleware";
import { logger } from "../../../../common/logger";
import { bundlerSimulatonServiceMap } from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";
import {
  RPCBadRequest,
  RPCInternalServerError,
  RPCResponse,
  tryFindEntrypoint,
} from "./helpers";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

class PVGResponse extends RPCResponse {
  constructor(
    public id: number,
    public result: {
      preVerificationGas: string;
    },
  ) {
    super(id);
  }
}

export const calculatePreVerificationGas = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.body;

  try {
    const chainId = parseInt(req.params.chainId, 10);

    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];

    const entryPointContract = tryFindEntrypoint(chainId, entryPointAddress);
    if (!entryPointContract) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(
          new RPCBadRequest(
            id,
            `Entry point with address=${entryPointAddress} not supported by Bundler`,
          ),
        );
    }

    const pvg = await bundlerSimulatonServiceMap[
      chainId
    ].calcPreVerificationGas(userOp, chainId, entryPointContract);

    return res
      .status(STATUSES.SUCCESS)
      .json(new PVGResponse(id, { preVerificationGas: pvg.toString() }));
  } catch (error) {
    log.error(
      `Error in calculatePreVerificationGas handler ${parseError(error)}`,
    );
    return res
      .status(STATUSES.INTERNAL_SERVER_ERROR)
      .json(new RPCInternalServerError(id, error));
  }
};
