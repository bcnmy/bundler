import { Router } from 'express';
import { relayApiRouter } from './relay.routes';
import { crossChainRouter } from '../cross-chain/cross-chain.routes';
import { adminApiRouter } from '../admin/admin.routes';

const routes = Router();

routes.use('/api/v1/cross-chain', crossChainRouter);
routes.use('/api/v1/relay', relayApiRouter);
routes.use('/admin', adminApiRouter);

export { routes };
