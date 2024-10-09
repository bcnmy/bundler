/* eslint-disable import/first */
import httpMocks, { RequestOptions } from "node-mocks-http";

const entryPointAddress = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789";
const entryPointContract = {
  address: entryPointAddress,
};
const chainId = "1";
const requestId = "123";

// These mock functions are used in tests to control what is returned by other services the endpoint depends on
const estimateUserOperationGasMock = jest.fn();
const getGasPriceMock = jest.fn();
const transactionDaoSaveMock = jest.fn();
const userOperationStateDaoSaveMock = jest.fn();
const userOperationDaoSaveMock = jest.fn();
const sendTransactionToRelayerMock = jest.fn();

async function saveUserOperation(
  chainIdd: number,
  userOperationData: InitialUserOperationDataType,
): Promise<void> {
  // console.log(`Nonce: ${otherNumber}`);
  console.log(JSON.stringify(userOperationData, null, 2));
  userOperationDaoSaveMock(chainIdd, userOperationData);
}

// 💡 These import mocks have to happen before we call import { bundleUserOperation }
// because bundleUserOperation imports the service manager produces SIDE EFFECTS (bad practice) like trying to connect to the DB
jest.mock("../../../../common/service-manager", () => ({
  entryPointMap: {
    1: [entryPointContract],
    2: [entryPointContract],
    3: [entryPointContract],
  },
  bundlerSimulationServiceMap: {
    1: {
      estimateUserOperationGas: estimateUserOperationGasMock,
    },
    3: {
      estimateUserOperationGas: estimateUserOperationGasMock,
    },
  },
  gasPriceServiceMap: {
    1: {
      getGasPrice: getGasPriceMock,
    },
  },
  transactionDao: { save: transactionDaoSaveMock },
  userOperationStateDao: { save: userOperationStateDaoSaveMock },
  userOperationDao: { save: saveUserOperation },
  routeTransactionToRelayerMap: {
    1: {
      BUNDLER: {
        sendTransactionToRelayer: sendTransactionToRelayerMock,
      },
    },
  },
}));

// Now we can import after we have mocked the dependencies
import { bundleUserOperation } from "./handler";
import { InitialUserOperationDataType } from "../../../../common/db";

describe("/eth_sendUserOperation", () => {
  afterEach(() => {
    estimateUserOperationGasMock.mockClear();
    getGasPriceMock.mockClear();
  });

  // This test acts as a CONTRACT test for the most common use case, ensuring that the returned value has the expected format
  test("nonce > max number", async () => {
    const bigNonce = 18446744073709551628n;

    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {
            sender: "0xCe267D94aeDF8457135Da153B6F9E74a45781F9E",
            paymasterAndData:
              "0xe3dc822d77f8ca7ac74c30b0dffea9fcdcaaa321000000000000000000000000000000000000000000000000000000006657398000000000000000000000000000000000000000000000000000000000000000002417136b115ef1b80ba0497e33f160c37bafe485209946a01a095bfdaa8c0060584f88f099505b46628ed9a75a99caade13ba53c62b2919180c5525e0a94759f1b",
            nonce: bigNonce,
          }, // userOp
          entryPointAddress,
          "0x1234", // userOpHash
        ],
      },
    };

    // Expected nonce: 18446744073709551628
    // Max safe int:   9007199254740991
    // Bad nonce:      18446744073709550000,

    // getGasPriceMock.mockReturnValue(1005n);
    sendTransactionToRelayerMock.mockReturnValueOnce({
      code: 200,
      transactionId: "0x123",
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await bundleUserOperation(request, response);

    // console.log(response._getJSONData());
    // console.log(sendTransactionToRelayerMock.mock.calls[0]);

    // console.log(userOperationDaoSaveMock.mock.calls[0]);

    // Check the returned values
    expect(response.statusCode).toBe(200);
  });
});
