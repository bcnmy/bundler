import { Router } from 'express';
import { transactionStatusApi, feeOptionsApi, requestHandler } from '../../controllers';
import { simulateTransaction } from '../../controllers/simulate';
import { validateRelayRequest, validateFeeOption, validateTransactionStatus } from '../../middleware';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateFeeOption, feeOptionsApi);

relayApiRouter.get('/status', validateTransactionStatus, transactionStatusApi);

relayApiRouter.post('/', validateRelayRequest(), simulateTransaction(), requestHandler);

relayApiRouter.post('/resubmit', validateTransactionStatus, transactionStatusApi);
