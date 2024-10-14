import { RPCResponse } from "../shared/response";

export class EstimateUserOperationGasResponse extends RPCResponse {
  constructor(
    public result = {
      callGasLimit: 0,
      verificationGasLimit: 0,
      preVerificationGas: 0,
      paymasterPostOpGasLimit: 0,
      paymasterVerificationGasLimit: 0,
      maxPriorityFeePerGas: 0,
      maxFeePerGas: 0,
    },
  ) {
    super();
  }
}
