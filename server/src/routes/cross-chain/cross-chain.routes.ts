import { Router } from 'express';
import { estimateDepositAndCallApi, processApi } from '../../controllers';

export const crossChainRouter = Router();

// TODO: ADD Validation
crossChainRouter.post('/process', processApi);
crossChainRouter.post('/estimate/depositAndCall', estimateDepositAndCallApi);
