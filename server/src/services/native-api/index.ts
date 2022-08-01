import { logger } from '../../../log-config';
import {
  IDaoUtils,
} from '../../dao-utils/interface/dao-utils';
import { STATUSES } from '../../middleware';
import { parseError, stringify } from '../../utils/util';
import { checkIfActiveDapp } from './active-dapp-check';
import { apiIdAuth } from './api-id-auth';
import { apiKeyAuth } from './api-key-auth';
import { checkDomains } from './check-domain';
import { checkLimits, getLimitsUsage } from './check-limits';
import { forwardPreFlightCheck } from './forward-pre-flight-check';
import { validateConditionalLimit } from './validate-condition';

import {
  ContractMetaTransactionType,
  ErrorType, isError, NativeAPIParamsType,
  ValidateResponseType,
} from './interface/native-api';
import { metaInfoAuth } from './meta-info-auth';
import { smartContractAuth } from './smart-contract-auth';

const log = logger(module);

export class NativeAPI {
  daoUtils: IDaoUtils;

  apiIdAuth = apiIdAuth;

  apiKeyAuth = apiKeyAuth;

  checkDomains = checkDomains;

  checkIfActiveDapp = checkIfActiveDapp;

  smartContractAuth = smartContractAuth;

  metaInfoAuth = metaInfoAuth;

  forwardPreFlightCheck = forwardPreFlightCheck;

  checkLimits = checkLimits;

  getLimitsUsage = getLimitsUsage;

  validateConditionalLimit = validateConditionalLimit;

  constructor(daoUtils: IDaoUtils) {
    this.daoUtils = daoUtils;
  }

  validate = async (params: NativeAPIParamsType): Promise<ValidateResponseType | ErrorType> => {
    const {
      apiKey,
      apiId,
      transactionParams,
      origin,
      userAddress,
      metaInfo,
      signatureType,
      to,
    } = params;

    let { from } = params;

    try {
      if (userAddress && !from) {
        from = userAddress.toLowerCase();
      } else if (from) {
        from = from?.toLowerCase();
      }

      const apiIdAuthData = await this.apiIdAuth(apiId);
      if (isError(apiIdAuthData)) {
        return apiIdAuthData;
      }

      const apiKeyAuthData = await this.apiKeyAuth(apiKey, apiId);
      if (isError(apiKeyAuthData)) {
        log.error(`error in apiKeyAuthData ${stringify(apiKeyAuthData)}`);
        return apiKeyAuthData;
      }
      const {
        dappId,
        active,
        // enableWhiteList,
        dappLimit,
        userLimit,
        apiLimit,
        dappLimitStatus,
        userLimitStatus,
        apiLimitStatus,
        networkId,
      } = apiKeyAuthData;

      const checkDomainData = await this.checkDomains(
        this.daoUtils,
        origin as string,
        dappId,
      );
      if (isError(checkDomainData)) {
        log.error(`error in checkDomainData ${stringify(checkDomainData)}`);
        return checkDomainData;
      }
      const activeDappCheckData = await this.checkIfActiveDapp(dappId, active);
      if (isError(activeDappCheckData)) {
        log.error(`error in checkIfActiveDapp ${stringify(checkIfActiveDapp)}`);
        return activeDappCheckData;
      }

      const smartContractData = await this.smartContractAuth(apiIdAuthData.contractId);
      if (isError(smartContractData)) {
        log.error(`error in smartContractData ${stringify(smartContractData)}`);
        return smartContractData;
      }
      const {
        metaTransactionType,
      } = smartContractData;

      // TODO: review
      const metaInfoAuthData = await this.metaInfoAuth(
        metaInfo,
        signatureType,
      );
      if (isError(metaInfoAuthData)) {
        return metaInfoAuthData;
      }

      if (metaTransactionType === ContractMetaTransactionType.FORWARD) {
        const forwardRequest = transactionParams[0];
        // Note : In case of metaInfo provided with forwardRequestType = 'V2'
        // This would be request.request // Ref : Sandbox
        await this.forwardPreFlightCheck(parseInt(networkId, 10), forwardRequest);
      }

      const checkLimitsData = await this.checkLimits(
        dappId,
        dappLimit,
        userLimit,
        apiLimit,
        dappLimitStatus,
        userLimitStatus,
        apiLimitStatus,
        networkId,
        from as string,
        apiId as string,
      );
      if (isError(checkLimitsData)) {
        return checkLimitsData;
      }
      const { maxUsage, currentUsage } = checkLimitsData;

      const checkConditionalLimit = await this.validateConditionalLimit(
        this.daoUtils,
        from as string,
        apiId as string,
      );

      if (isError(checkConditionalLimit)) {
        return checkConditionalLimit;
      }

      const validatedData = {
        networkId,
        conditional: {
          passed: checkConditionalLimit.conditionPassed,
          msg: checkConditionalLimit.errorMessage,
        },
        apiData: {
          contractId: apiIdAuthData.contractId.toString(),
          method: apiIdAuthData.method,
          methodType: apiIdAuthData.methodType,
        },
        dappId,
        smartContractData: {
          address: smartContractData.address || to,
          metaTransactionType: smartContractData.metaTransactionType,
          abi: smartContractData.abi as JSON,
        },
        limitsData: {
          maxUsage: {
            dappLimit: maxUsage?.dappLimit,
            userLimit: maxUsage?.userLimit,
            apiLimit: maxUsage?.apiLimit,
          },
          currentUsage: {
            dappLimit: currentUsage?.dappLimit,
            apiLimit: currentUsage?.apiLimit,
            userLimit: currentUsage?.userLimit,
          },
        },
      };
      return validatedData;
    } catch (error: any) {
      log.error(`error in Native API ${parseError(error)}`);
      return {
        error: parseError(error),
        code: STATUSES.INTERNAL_SERVER_ERROR,
      };
    }
  };
}
