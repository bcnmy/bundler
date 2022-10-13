import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CCMPMessage } from '../../../../common/types';
import { CCMPWatchTower } from '../../services/ccmp/ccmp-watch-tower';

export const hookApi = async (req: Request, res: Response) => {
    console.log("/hook called:", req.body);
    console.log("/hook called (payload):", req.body.data.payload);
    const {
        chainId,
        from,
        scAddress,
        event: eventName,
        data,
        txHash,
        gasUsage
    } = req.body; // TODO: what data is needed exactly (storage vs processing)


    const eventData: CCMPMessage = {
        ...data,
        gasFeePaymentArgs: {
            feeTokenAddress: req.body.data.gasFeePaymentArgs.FeeTokenAddress,
            feeAmount: req.body.data.gasFeePaymentArgs.FeeAmount,
            relayer: req.body.data.gasFeePaymentArgs.Relayer
        },
        payload: req.body.data.payload.map((msg: any) => ({
            to: msg.To,
            _calldata: msg.Calldata
        }))
    }

    const watchTower = new CCMPWatchTower(); // TODO: add watchtower to servicemanager?

    // TODO: check for connection closure
    watchTower.processTransaction(
        txHash,
        gasUsage,
        chainId,
        from,
        scAddress,
        eventName,
        eventData
    );

    res.status(StatusCodes.ACCEPTED).send("CCMP event webhook started processing.");
};
