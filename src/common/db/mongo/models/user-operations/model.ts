import mongoose from "mongoose";
import { config } from "../../../../config";
import { UserOperationSchema } from "./schema";
import { IUserOperation } from "../../interface";

const { supportedNetworks } = config;

export type UserOperationsMapType = {
  [networkId: number]: mongoose.Model<IUserOperation, {}, {}, {}>;
};

const UserOperationsMap: UserOperationsMapType = {};

for (const networkId of supportedNetworks) {
  const collectionName = `UserOperations_${networkId}`;
  UserOperationsMap[networkId] = mongoose.model(
    collectionName,
    UserOperationSchema,
  );
}

export { UserOperationsMap };
