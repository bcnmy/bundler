import { Router } from 'express';
import { relayApiRouter } from './relay/relay.routes';
import { hookRouter } from './hook/hook.routes';
import { adminApiRouter } from './admin/admin.routes';

const routes = Router();

routes.use('/relay', relayApiRouter);
routes.use('/hook', hookRouter);
routes.use('/api/v1/relay', relayApiRouter);
routes.use('/admin', adminApiRouter);

export { routes };
