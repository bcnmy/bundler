import { config } from '../../config';
import { DaoUtils } from '../dao-utils';
import { Mongo } from '../../../common/db';

const { supportedNetworks } = config;

if (!supportedNetworks) {
  throw new Error('supportedNetworks is undefined');
}

if (supportedNetworks) {
  supportedNetworks.forEach((networkId: number) => {
    const sysInfo = new SystemInfo(networkId);
    systemInfoAPIInstance[networkId] = sysInfo;
  });
}

const dbInstance = new Mongo(config.supportedNetworks);
const daoUtilsInstance = new DaoUtils(dbInstance);

(async () => {
  await dbInstance.connect();
})();

export {
  daoUtilsInstance,
  nativeApiInstance,
  dbInstance,
  systemInfoAPIInstance,

};
