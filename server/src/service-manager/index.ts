import { Mongo } from '../../../common/db';
import { DaoUtils } from '../dao-utils';
import { initSetERC20TokenPrices } from '../utils/coin-market-cap';

const dbInstance = new Mongo(process.env.MONGO_URL || '');
const daoUtilsInstance = new DaoUtils(dbInstance);

(async () => {
  await dbInstance.connect();
  await initSetERC20TokenPrices();
})();

export {
  daoUtilsInstance,
  dbInstance,

};
