import { Router } from 'express';
import { settings, status, deleteCacheAPI } from '../../controllers';

export const adminApiRouter = Router();

adminApiRouter.get('/', settings);
adminApiRouter.get('/status', status);
adminApiRouter.post('/cache/delete', deleteCacheAPI);
