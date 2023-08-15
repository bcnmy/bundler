import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { axiosPostCall, parseError } from '../../../../common/utils';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const log = logger(module);

export const authenticate = async (req: Request) => {
  try {
    const { chainId, dappAPIKey } = req.params;
    log.info(`chainId from request params: ${chainId}`);
    log.info(`dappAPIKey from request params: ${dappAPIKey}`);

    const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

    const response = await axiosPostCall(`${aaDashboardBackendBaseUrl}/${chainId}/${dappAPIKey}`);

    const {
      isAuthenticated,
      message,
      bundlerRequestId,
    } = response;

    log.info(`Response from AA Dashboard Backend: ${JSON.stringify(response)}`);

    if (!isAuthenticated) {
      return {
        code: STATUSES.UNAUTHORIZED,
        message: `APIKey not authenticated with message: ${message}`,
        data: {
          bundlerRequestId,
        },
      };
    }

    return {
      code: STATUSES.ACTION_COMPLETE,
      message: 'Authenticated',
      data: {
        bundlerRequestId,
      },
    };
  } catch (error) {
    log.error(`Error in authentication for bundler request: ${parseError(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      message: 'Not authenticated',
      data: null,
    };
  }
};
