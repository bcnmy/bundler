import { Router } from 'express';
import {
  estimateDepositAndCallApi,
  processApi,
  processFromIndexerApi,
  statusFromMessageHashApi,
  statusFromTxHashApi,
} from '../../controllers';
import {
  validateCrossChainProcessFromIndexerRequest,
  validateCrossChainStatusFromMessageHash,
  validateCrossChainStatusFromTx,
  validateEstimateDepositAndCallRequest,
} from '../../middleware';

export const crossChainRouter = Router();

crossChainRouter.post('/process', validateEstimateDepositAndCallRequest, processApi);
crossChainRouter.post(
  '/process/indexer',
  validateCrossChainProcessFromIndexerRequest,
  processFromIndexerApi,
);
crossChainRouter.post(
  '/estimate/depositAndCall',
  validateEstimateDepositAndCallRequest,
  estimateDepositAndCallApi,
);
crossChainRouter.get('/status/tx', validateCrossChainStatusFromTx, statusFromTxHashApi);
crossChainRouter.get(
  '/status/message-hash',
  validateCrossChainStatusFromMessageHash,
  statusFromMessageHashApi,
);
