import { Router } from 'express';
import {
  estimateDepositAndCallApi,
  processFromMessageApi,
  processFromIndexerApi,
  statusFromMessageHashApi,
  statusFromTxHashApi,
  supportedRoutersAPI,
  processFromSourceTxHash,
} from '../../controllers';
import {
  validateCrossChainProcessFromIndexerRequest,
  validateCrossChainProcessFromMessageRequest,
  validateCrossChainProcessFromTxRequest,
  validateCrossChainStatusFromMessageHash,
  validateCrossChainStatusFromTx,
  validateEstimateDepositAndCallRequest,
} from '../../middleware';

export const crossChainRouter = Router();

crossChainRouter.post('/process/message', validateCrossChainProcessFromMessageRequest, processFromMessageApi);

crossChainRouter.post('/process/tx', validateCrossChainProcessFromTxRequest, processFromSourceTxHash);

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

crossChainRouter.get('/supported-routers', supportedRoutersAPI);
