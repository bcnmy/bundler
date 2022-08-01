import { Router } from 'express';
import { deleteCacheAPI } from '../../controllers/admin';

export const adminAPIRouter = Router();

adminAPIRouter.post('/delete-cache', deleteCacheAPI);
