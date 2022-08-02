import { Mongo } from '../../../common/db';
import { config } from '../../config';
import { DaoUtils } from '../dao-utils';

const { supportedNetworks } = config;

if (!supportedNetworks) {
  throw new Error('supportedNetworks is undefined');
}

const dbInstance = new Mongo(config.supportedNetworks);
const daoUtilsInstance = new DaoUtils(dbInstance);

(async () => {
  await dbInstance.connect();
})();

export {
  daoUtilsInstance,
  dbInstance,

};
