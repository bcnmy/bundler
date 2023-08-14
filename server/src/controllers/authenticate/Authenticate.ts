import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { axiosGetCall } from '../../../../common/utils';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const log = logger(module);

export const authenticate = async (req: Request) => {
  const { chainId, dappAPIKey } = req.params;
  log.info(`chainId from request params: ${chainId}`);
  log.info(`dappAPIKey from request params: ${dappAPIKey}`);

  const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

  const response = await axiosGetCall(`${aaDashboardBackendBaseUrl}/${chainId}/${dappAPIKey}`);

  const {
    isAuthenticated,
    message,
  } = response;

  if (!isAuthenticated) {
    return {
      code: STATUSES.UNAUTHORIZED,
      message: `APIKey not authenticated with message: ${message}`,
    };
  }

  return {
    code: STATUSES.ACTION_COMPLETE,
    message: 'Authenticated',
  };
};
