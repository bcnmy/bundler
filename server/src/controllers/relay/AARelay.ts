import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { networkServiceMap, routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { generateTransactionId, getMetaDataFromUserOp, parseError } from '../../../../common/utils';
import {
  isError,
  RelayerDestinationSmartContractName,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

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
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
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

    try {
      const { dappAPIKey } = metaData;
      log.info(`dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      const {
        destinationSmartContractAddresses,
        destinationSmartContractMethods,
      } = await getMetaDataFromUserOp(
        userOp,
        chainId,
        dappAPIKey,
        networkServiceMap[chainId].ethersProvider,
      );
      metaData.destinationSmartContractAddresses = destinationSmartContractAddresses;
      metaData.destinationSmartContractMethods = destinationSmartContractMethods;
      log.info(`MetaData to be saved: ${JSON.stringify(metaData)} for dappAPIKey: ${dappAPIKey}`);

      await transactionDao.updateMetaDataAndRelayerDestinationContractDataByTransactionId(
        chainId,
        transactionId,
        metaData,
        entryPointAddress,
        RelayerDestinationSmartContractName.ENTRY_POINT,
      );
    } catch (error) {
      log.info(`Error in getting meta data from userOp: ${JSON.stringify(userOp)}`);
      log.info(`Error: ${error}`);
    }

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      code: STATUSES.SUCCESS,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in AA relay ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
