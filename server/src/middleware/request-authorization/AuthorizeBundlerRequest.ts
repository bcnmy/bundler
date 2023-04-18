// /* eslint-disable no-case-declarations */
// /* eslint-disable import/no-extraneous-dependencies */
// import { NextFunction, Request, Response } from 'express';
// import { v4 as uuidv4 } from 'uuid';
// import { logger } from '../../../../common/log-config';
// import { EthMethodType, TransactionMethodType } from '../../../../common/types';
// import {
//   bundlerChainIdRequestSchema,
//   bundlerEstimateUserOpGasRequestSchema,
//   bundlerGetUserOpByHashRequestSchema,
//   bundlerGetUserOpReceiptRequestSchema,
//   bundlerSendUserOpRequestSchema,
//   bundlerSupportedEntryPointsRequestSchema,
// } from '../../routes/bundler/bundler.schema';
// import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../RequestHelpers';

// const log = logger(module);

// export const authorizeBundlerRequest = () => async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const { chainId, bundlerAPIKey } = req.params;
//     const { method } = req.body;
//     let authorizationResponse;
//     switch (method) {
//       case TransactionMethodType.BUNDLER:
//         const requestId = uuidv4();
//         authorizationResponse = bundlerSendUserOpRequestSchema.validate(req.body);
//         break;
//       case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
//         const requestId = uuidv4();
//         authorizationResponse = bundlerEstimateUserOpGasRequestSchema.validate(req.body);
//         break;
//       case EthMethodType.GET_USER_OPERATION_BY_HASH:
//         const requestId = uuidv4();
//         authorizationResponse = bundlerGetUserOpByHashRequestSchema.validate(req.body);
//         break;
//       case EthMethodType.GET_USER_OPERATION_RECEIPT:
//         const requestId = uuidv4();
//         authorizationResponse = bundlerGetUserOpReceiptRequestSchema.validate(req.body);
//         break;
//       case EthMethodType.SUPPORTED_ENTRY_POINTS:
//         const requestId = uuidv4();
//         authorizationResponse = bundlerSupportedEntryPointsRequestSchema.validate(req.body);
//         break;
//       case EthMethodType.CHAIN_ID:
//         authorizationResponse = bundlerChainIdRequestSchema.validate(req.body);
//         break;
//       default:
//         return res.status(STATUSES.BAD_REQUEST).send({
//           code: STATUSES.BAD_REQUEST,
//           error: 'Wrong transaction type sent in validate BUNDLER request',
//         });
//     }

//     return res.send({
//       code: BUNDLER_VALIDATION_STATUSES.INVALID_USER_OP_FIELDS,
//       error: message,
//     });
//   } catch (e: any) {
//     log.error(e);
//     return res.status(STATUSES.BAD_REQUEST).send({
//       code: STATUSES.BAD_REQUEST,
//       error: JSON.stringify(e),
//     });
//   }
// };
