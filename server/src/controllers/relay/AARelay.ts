import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { generateTransactionId, getMetaDataFromUserOp } from '../../../../common/utils';
import {
  isError,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { config } from '../../../../config';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];
    const metaData = req.body.params[3];
    const gasLimitFromSimulation = req.body.params[4];

    const transactionId = generateTransactionId(userOp);

    const walletAddress = userOp.sender.toLowerCase();

    await transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.AA,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress,
      metaData,
      resubmitted: false,
      creationTime: Date.now(),
    });

    if (!routeTransactionToRelayerMap[chainId][TransactionType.AA]) {
      return res.status(400).json({
        code: 400,
        error: `${TransactionMethodType.AA} method not supported for chainId: ${chainId}`,
      });
    }
    const response = routeTransactionToRelayerMap[chainId][TransactionType.AA]
      .sendTransactionToRelayer({
        type: TransactionType.AA,
        to: entryPointAddress,
        data: '0x0',
        gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
        chainId,
        value: '0x0',
        userOp,
        transactionId,
        walletAddress,
        metaData,
      });

    const { dappAPIKey } = metaData;
    try {
      const {
        destinationSmartContractAddresses,
        destinationSmartContractMethods,
      } = await getMetaDataFromUserOp(userOp, chainId, dappAPIKey);
      metaData.destinationSmartContractAddresses = destinationSmartContractAddresses;
      metaData.destinationSmartContractMethods = destinationSmartContractMethods;
      log.info(`MetaData to be saved: ${JSON.stringify(metaData)} for dappAPIKey: ${dappAPIKey}`);

      await transactionDao.updateMetaDataByTransactionId(
        chainId,
        transactionId,
        metaData,
      );
    } catch (error) {
      log.info(`Error in getting meta data from userOp: ${JSON.stringify(userOp)} for dappAPIKey: ${dappAPIKey}`);
      log.info(`Error: ${error}`);
    }

    if (isError(response)) {
      return res.status(400).json({
        code: 400,
        error: response.error,
      });
    }
    return res.status(200).json({
      code: 200,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in AA relay ${JSON.stringify(error)}`);
    return res.status(500).json({
      code: 500,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
