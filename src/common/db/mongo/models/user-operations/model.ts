import mongoose from "mongoose";
import { config } from "../../../../../config";
import { IUserOperation, IUserOperationV07 } from "../../interface";
import { UserOperationSchema, UserOperationV07Schema } from "./schema";

const { supportedNetworks, supportedNetworksV07 } = config;

export type UserOperationsMapType = {
  [networkId: number]: mongoose.Model<IUserOperation, {}, {}, {}>;
};

export type UserOperationsV07MapType = {
  [networkId: number]: mongoose.Model<IUserOperationV07, {}, {}, {}>;
};

const UserOperationsMap: UserOperationsMapType = {};
const UserOperationsV07Map: UserOperationsV07MapType = {};

for (const networkId of supportedNetworks) {
  const collectionName = `UserOperations_${networkId}`;
  UserOperationsMap[networkId] = mongoose.model(
    collectionName,
    UserOperationSchema,
  );
}

for (const networkId of supportedNetworksV07) {
  const collectionNameV07 = `UserOperationsV07_${networkId}`;
  UserOperationsV07Map[networkId] = mongoose.model(
    collectionNameV07,
    UserOperationV07Schema,
  );
}

export { UserOperationsMap, UserOperationsV07Map };
