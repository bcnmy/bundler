import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { relayerManagerTransactionTypeNameMap } from '../../../../common/maps';
import { EVMRelayerManagerMap, transactionDao, transactionSerivceMap } from '../../../../common/service-manager';
import { TransactionType } from '../../../../common/types';
import { parseError } from '../../../../common/utils';

const log = logger(module);

export const transactionResubmitApi = async (req: Request, res: Response) => {
  const chainIdInStr = req.query.chainId as string;
  const chainId = parseInt(chainIdInStr, 10);
  const transactionId = req.query.transactionId as string;
  const gasPrice = req.query.gasPrice as string;

  const response = await transactionDao.getByTransactionId(chainId, transactionId);
  try {
    if (!response) {
      return res.status(404).json({
        code: 404,
        error: 'Transaction not found',
      });
    }

    // find the relayer that has initiated the transaction using EVMRelayerManager
    const relayer = await EVMRelayerManagerMap[
      relayerManagerTransactionTypeNameMap[response.transactionType as TransactionType]][chainId]
      .getRelayer(
        response.relayerAddress,
      );

    if (relayer) {
      const rawTransaction = {
        from: relayer.getPublicKey(),
        gasPrice,
        gasLimit: response.rawTransaction.gasLimit,
        to: response.rawTransaction.to,
        value: response.rawTransaction.value,
        data: response.rawTransaction.data,
        chainId,
        nonce: response.rawTransaction.nonce,
      };
      log.info(`Resubmitting transaction ${transactionId} with gasPrice ${gasPrice} on chainId ${chainId} and raw transaction data ${JSON.stringify(rawTransaction)}`);
      const result = await transactionSerivceMap[chainId].executeTransaction({
        rawTransaction,
        account: relayer,
      });
      log.info(`Resubmitted transaction ${transactionId} on chainId ${chainId} and result ${JSON.stringify(result)}`);
      if (result.success) {
        return res.json({
          code: 200,
          data: {
            transactionResponse: result.transactionResponse,
          },
        });
      }
      return res.status(400).json({
        code: 400,
        error: result.error,
      });
    }

    return res.status(404).json({
      code: 404,
      error: 'Relayer not found',
    });
  } catch (error) {
    log.error(`Error in transaction resubmit ${parseError(error)}`);
    return res.status(500).json({
      code: 500,
      error: parseError(error),
    });
  }
};
