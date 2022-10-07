import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { aaSimulatonServiceMap } from '../../../../common/service-manager';
import { config } from '../../../../config';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateAATransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userOp, entryPointAddress, chainId,
    } = req.body.params;

    const entryPointData = config.entryPointData[chainId];
    let entryPointAbi;
    for (const entryPoint of entryPointData) {
      if (entryPointAddress === entryPoint.address) {
        entryPointAbi = entryPoint.abi;
      }
    }
    if (!entryPointAbi) {
      return res.status(400).json({
        error: 'Entry point not found in relayer node',
      });
    }
    entryPointAbi = entryPointAbi.toString();
    await aaSimulatonServiceMap[chainId]
      .simulate({ userOp, entryPointAddress, entryPointAbi });
    next();
  } catch (error) {
    log.error(`Error in simulateAATransaction ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
