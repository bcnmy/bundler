import { Router } from 'express';
import { estimateDepositAndCallApi, processApi, processFromIndexerApi } from '../../controllers';
import {
  validateCrossChainProcessFromIndexerRequest,
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
