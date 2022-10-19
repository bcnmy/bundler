import { ethers } from 'ethers';
import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { entryPointMap, routeTransactionToRelayerMap } from '../../../../common/service-manager';
import { isError, TransactionType } from '../../../../common/types';
import { config } from '../../../../config';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = config.socketService.wssUrl;
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];
    const gasLimitFromSimulation = req.body.params[3];

    const transactionId = generateTransactionId(userOp);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }

    const entryPointContracts = entryPointMap[chainId];

    let entryPointContract;
    for (let entryPointContractIndex = 0;
      entryPointContractIndex < entryPointContracts.length;
      entryPointContractIndex += 1) {
      if (entryPointContracts[entryPointContractIndex].address.toLowerCase()
       === entryPointAddress.toLowerCase()) {
        entryPointContract = entryPointContracts[entryPointContractIndex].entryPointContract;
        break;
      }
    }

    // eslint-disable-next-line no-unsafe-optional-chaining
    const { data } = await (entryPointContract as ethers.Contract)
      .populateTransaction.handleOps([userOp], config.feeOption.refundReceiver[chainId]);

    const response = await routeTransactionToRelayerMap[chainId][TransactionType.AA]
      .sendTransactionToRelayer({
        type: TransactionType.AA,
        to: entryPointAddress,
        data: data as string,
        gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
        chainId,
        value: '0x0',
        transactionId,
      });
    if (isError(response)) {
      return res.status(400).json({
        msg: 'bad request',
        error: response.error,
      });
    }
    return {
      transactionId,
      connectionUrl: websocketUrl,
    };
  } catch (error) {
    log.error(`Error in AA relay ${error}`);
    return res.status(500).json({
      error: JSON.stringify(error) || 'Internal server error',
    });
  }
};
