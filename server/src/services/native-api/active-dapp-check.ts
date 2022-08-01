import { STATUSES } from '../../middleware';
import { getGasManagerEnableFlagKey } from '../../utils/cache-utils';
import { logger } from '../../../log-config';
import { CheckIfActiveDappType, ErrorType } from './interface/native-api';
import { cache } from '../caching';

const log = logger(module);

export async function checkIfActiveDapp(
  dappId: string,
  active: boolean,
): Promise<CheckIfActiveDappType | ErrorType> {
  const isGasManagerEnabled = await cache.get(getGasManagerEnableFlagKey());
  if (isGasManagerEnabled && isGasManagerEnabled === '1') {
    if (!active) {
      log.info(`Dapp ${dappId} is not active`);
      return {
        error: `Dapp with id ${dappId} is not allowed to relay transactions. Please fill gas tank`,
        code: STATUSES.BAD_REQUEST,
      };
    }
    return {
      isDappActive: active,
    };
  }
  log.info(`isGasManagerEnabled is set to ${isGasManagerEnabled}`);
  return {
    isDappActive: true,
  };
}
