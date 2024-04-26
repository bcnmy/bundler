/* eslint-disable import/no-import-module-exports */
import { UpdateRequestDataType } from "../../../../common/types";
import {
  axiosPatchCall,
  customJSONStringify,
  parseError,
} from "../../../../common/utils";
import { config } from "../../../../config";
import { getLogger } from "../../../../common/logger";

const log = getLogger(module);

export const updateRequest = async (
  updateRequestData: UpdateRequestDataType,
) => {
  try {
    const {
      chainId,
      apiKey,
      bundlerRequestId,
      rawResponse,
      httpResponseCode,
      transactionId,
    } = updateRequestData;
    const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

    const response = await axiosPatchCall(
      `${aaDashboardBackendBaseUrl}/${chainId}/${apiKey}`,
      {
        _id: bundlerRequestId,
        rawResponse,
        transactionId,
        httpResponseCode,
      },
    );

    log.info(
      `Response from AA Dashboard Backend for updating request: ${customJSONStringify(
        response,
      )}`,
    );
  } catch (error) {
    log.error(
      `Error in updating bundler request with error: ${parseError(error)}`,
    );
  }
};
