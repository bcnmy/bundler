import { IDappConfig } from '@bcnmy/db-sdk/dist/schemas';
import { parse } from 'url';
import { logger } from '../../../log-config';
import { IDaoUtils } from '../../dao-utils/interface/dao-utils';
import { getDappConfigKey } from '../../utils/cache-utils';
import { cache } from '../caching';
import { CheckDomainsResponseType, ErrorType } from './interface/native-api';

const log = logger(module);

export async function checkDomains(
  daoUtilsInstance: IDaoUtils,
  origin: string,
  dappId: string,
): Promise<CheckDomainsResponseType | ErrorType> {
  const cachedDappConfigData = await cache.get(getDappConfigKey(dappId));
  let dappConfig: IDappConfig;
  if (cachedDappConfigData) {
    dappConfig = JSON.parse(cachedDappConfigData);
  } else {
    dappConfig = await daoUtilsInstance.findAllowedDomainsByDappId(dappId);
    await cache.set(getDappConfigKey(dappId), JSON.stringify(dappConfig));
  }
  if (dappConfig) {
    const { allowedDomains } = dappConfig;
    if (allowedDomains && allowedDomains.length > 0) {
      const parsedOrigin = parse(origin, true);

      const paresedOriginHostname = parsedOrigin.hostname || parsedOrigin.pathname as string;
      const originHostName = paresedOriginHostname.split('.').length > 2 ? paresedOriginHostname.split('.').slice(1).join('.') : paresedOriginHostname;
      let domainAllowed = false;
      log.info(`Origin hostname ${originHostName} for dappId ${dappId}`);
      for (const allowedDomain of allowedDomains) {
        log.info(`Checking domain ${allowedDomain} against ${originHostName}`);
        // TODO make the logic strict to not allow partial matching of domain
        if (allowedDomain.includes(originHostName)) {
          domainAllowed = true;
          break;
        }
      }
      if (!domainAllowed) {
        return {
          code: 400,
          error: 'Unauthorized domain',
        };
      }
      return {
        domainAllowed,
      };
    }
    log.info(`No restriction on domains for dappId ${dappId}`);
  }
  log.info(`No dappConfig for dappId ${dappId}`);

  return {
    domainAllowed: true,
  };
}
