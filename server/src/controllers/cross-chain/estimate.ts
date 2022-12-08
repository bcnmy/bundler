import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import {
  liquidityPoolService,
  crossChainGasEstimationServiceMap,
} from '../../../../common/service-manager';

const log = logger(module);

export const estimateDepositAndCallApi = async (req: Request, res: Response) => {
  const {
    fromChainId,
    toChainId,
    fromTokenAddress,
    receiverAddress,
    amountInWei,
    adaptorName,
    payloads,
  } = req.body;

  log.info(
    `Estimate Deposit and Call Paramters: ${JSON.stringify({
      fromChainId,
      toChainId,
      fromTokenAddress,
      receiverAddress,
      amountInWei,
      adaptorName,
      payloads,
    })}`,
  );

  try {
    const message = await liquidityPoolService.generateDepositAndCallMessage(
      fromChainId,
      toChainId,
      fromTokenAddress,
      receiverAddress,
      amountInWei,
      adaptorName,
      payloads,
    );

    const gasFeeEstimate = await crossChainGasEstimationServiceMap[toChainId].estimateCrossChainFee(
      '0xNOT_GENERATED',
      message,
    );
    res.status(StatusCodes.OK).json({
      tokenSymbol: gasFeeEstimate.tokenSymbol,
      amountInWei: gasFeeEstimate.amount.toString(),
    });
  } catch (e) {
    log.error(`Error estimating gas fee for deposit and call ${JSON.stringify(e)}`);
    if (e instanceof Error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(e.message);
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Unknown Error');
    }
  }
};
