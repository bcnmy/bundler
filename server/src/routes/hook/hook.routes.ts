import { Router } from 'express';
import { hookApi } from '../../controllers';

export const hookRouter = Router();

// TODO: ADD Validation
// TODO: needs a better name
hookRouter.post('/', hookApi);
