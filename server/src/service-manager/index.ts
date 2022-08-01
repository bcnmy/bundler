import { config } from '../../config';
import { DaoUtils } from '../dao-utils';
import { Mongo } from '../db/mongo';
import { NativeAPI } from '../services/native-api';
import { SystemInfo } from '../services/system-info';
import { init } from '../utils/tracing';

const systemInfoAPIInstance : Record<number, SystemInfo> = {};

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
const nativeApiInstance = new NativeAPI(daoUtilsInstance);

(async () => {
  await dbInstance.connect();
})();

export {
  daoUtilsInstance,
  nativeApiInstance,
  dbInstance,
  systemInfoAPIInstance,

};
