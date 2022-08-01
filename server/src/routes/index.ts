import { Router } from 'express';
import { adminAPIRouter } from './admin/admin.routes';
import { nativeAPIRouter } from './native/native.routes';
import { nativeAPIRouterV2 } from './old-native/native.routes';
import { sdkRouter } from './sdk/sdk.routes';
import { systemInfoAPIRouter } from './system-info/system-info.routes';

const routes = Router();
const routesV2 = Router();

routes.use('/admin', adminAPIRouter);
routes.use('/native', nativeAPIRouter);
routes.use('/systemInfo', systemInfoAPIRouter);
routes.use('/sdk', sdkRouter);
routesV2.use('/meta-tx/native', nativeAPIRouterV2);

export { routes, routesV2 };
