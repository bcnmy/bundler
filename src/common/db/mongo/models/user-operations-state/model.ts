import mongoose from 'mongoose';
import { config } from '../../../../../config';
import { IUserOperationState } from '../../interface';
import { UserOperationStateSchema } from './schema';

const { supportedNetworks } = config;

export type UserOperationsStateMapType = {
  [networkId: number]: mongoose.Model<IUserOperationState, {}, {}, {}>;
};

const UserOperationsStateMap: UserOperationsStateMapType = {};

for (const networkId of supportedNetworks) {
  const collectionName = `UserOperations_State_${networkId}`;
  UserOperationsStateMap[networkId] = mongoose.model(
    collectionName,
    UserOperationStateSchema,
  );
}

export { UserOperationsStateMap };
