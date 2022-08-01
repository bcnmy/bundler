import { MetaInfoType } from '../../common/types';
import { STATUSES } from '../../middleware';
import { config } from '../../../config';
import { MetaInfoAuthResponseType, ErrorType } from './interface/native-api';
import { logger } from '../../../log-config';

const log = logger(module);

export async function metaInfoAuth(
  metaInfo: MetaInfoType,
  signatureType: string,
): Promise<MetaInfoAuthResponseType | ErrorType> {
  // let shouldUsePersonalSign = true;
  if (signatureType) {
    if (
      signatureType === config.signatureType.EIP712_SIGNATURE
      || signatureType === config.signatureType.PERSONAL_SIGNATURE
    ) {
      log.info('valid signature type is passed');
      if (signatureType === config.signatureType.EIP712_SIGNATURE) {
        // shouldUsePersonalSign = false;
      }
    } else {
      return {
        error: `signatureType ${signatureType} is not supported`,
        code: STATUSES.BAD_REQUEST,
      };
    }
  }
  // else {
  //   return {
  //     error: 'signatureType not defined',
  //     code: STATUSES.BAD_REQUEST,
  //   };
  // }

  // TODO: Review
  // if (metaInfo) {
  //   if (metaInfo.permitType && metaInfo.permitData) {
  //     if (
  //       metaInfo.permitType === config.forwarder.permitType.DAI
  //        || metaInfo.permitType === config.forwarder.permitType.EIP2612) {
  //       log.info('valid permit type is passed');
  //     } else {
  //       return {
  //         error: `permit type ${metaInfo.permitType} is not supported`,
  //         flag: STATUSES.BAD_REQUEST,
  //         code: STATUSES.BAD_REQUEST,
  //       };
  //     }

  //     console.log(shouldUsePersonalSign);

  //     if (shouldUsePersonalSign) {
  //       return {
  //         error: `personal signature type
  //          ${config.signature.PERSONAL_SIGNATURE}
  //  is not supported for permit chained execution calls`,
  //         flag: STATUSES.BAD_REQUEST,
  //         code: STATUSES.BAD_REQUEST,
  //       };
  //     }
  //   } else {
  //     log.info('meta info is not currently supported and would be ignored');
  //   }
  //   return {
  //     success: true,
  //   };
  // }
  /* return {
      error: 'metaInfo not defined',
      flag: STATUSES.BAD_REQUEST,
      code: STATUSES.BAD_REQUEST,
    }; */

  return {
    success: true,
  };
}
