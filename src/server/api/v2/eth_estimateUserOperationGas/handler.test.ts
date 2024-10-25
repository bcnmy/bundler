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

// 💡 These import mocks have to happen before we call import { estimateUserOperationGas }
// because estimateUserOperationGas imports the service manager produces SIDE EFFECTS (bad practice) like trying to connect to the DB
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
}));

// Now we can import after we have mocked the dependencies
import { estimateUserOperationGas } from "./handler";

describe("EstimateUserOperationGas", () => {
  afterEach(() => {
    estimateUserOperationGasMock.mockClear();
    getGasPriceMock.mockClear();
  });

  // This test acts as a CONTRACT test for the most common use case, ensuring that the returned value has the expected format
  test("happy path: gas price is a bigint", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    estimateUserOperationGasMock.mockReturnValueOnce({
      code: 200,
      data: {
        callGasLimit: 1000n,
        verificationGasLimit: 1001n,
        preVerificationGas: 1002n,
        validUntil: 1003n,
        validAfter: 1004n,
      },
    });
    getGasPriceMock.mockReturnValue(1005n);

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    // Check the returned values
    expect(response.statusCode).toBe(200);

    expect(response._getJSONData()).toEqual({
      jsonrpc: "2.0",
      id: "123",
      result: {
        callGasLimit: 1000,
        verificationGasLimit: 1001,
        preVerificationGas: 1002,
        validUntil: "0x3eb",
        validAfter: "0x3ec",
        maxPriorityFeePerGas: "1005",
        maxFeePerGas: "1005",
      },
    });

    // Make sure that the dependencies were called with the expected values
    expect(estimateUserOperationGasMock).toHaveBeenCalledWith({
      userOp: {},
      entryPointContract,
      chainId: 1,
      stateOverrideSet: {},
    });

    expect(getGasPriceMock).toHaveBeenCalledTimes(1);
  });

  test("happy path: gas price returned is an object", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    estimateUserOperationGasMock.mockReturnValueOnce({
      code: 200,
      data: {
        callGasLimit: 1000n,
        verificationGasLimit: 1001n,
        preVerificationGas: 1002n,
        validUntil: 1003n,
        validAfter: 1004n,
      },
    });
    getGasPriceMock.mockReturnValue({
      maxPriorityFeePerGas: 1005n,
      maxFeePerGas: 1006n,
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    // Check the returned values
    expect(response.statusCode).toBe(200);

    expect(response._getJSONData()).toEqual({
      jsonrpc: "2.0",
      id: "123",
      result: {
        callGasLimit: 1000,
        verificationGasLimit: 1001,
        preVerificationGas: 1002,
        validUntil: "0x3eb",
        validAfter: "0x3ec",
        maxPriorityFeePerGas: "1005",
        maxFeePerGas: "1006",
      },
    });

    // Make sure that the dependencies were called with the expected values
    expect(estimateUserOperationGasMock).toHaveBeenCalledWith({
      userOp: {},
      entryPointContract,
      chainId: 1,
      stateOverrideSet: {},
    });

    expect(getGasPriceMock).toHaveBeenCalledTimes(1);
  });

  test("unsupported entrypoint", async () => {
    const unknownEntrypointAddress = "0xunknown";

    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          unknownEntrypointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    expect(response.statusCode).toBe(400);

    const responseData = response._getJSONData();

    expect(
      responseData.error.message.startsWith(
        `Entry point with entryPointAddress: ${unknownEntrypointAddress} not supported by the Bundler`,
      ),
    );

    expect(responseData.id).toBe(requestId);
  });

  test("can't estimateUserOperationGas for chainId", async () => {
    const unsupportedChainId = "2";

    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${unsupportedChainId}/test`,
      params: { chainId: unsupportedChainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    expect(response.statusCode).toBe(400);

    const responseData = response._getJSONData();
    expect(
      responseData.error.message.startsWith(
        "Can't estimate user operations gas",
      ),
    ).toBe(true);

    expect(responseData.id).toBe(requestId);
  });

  test("estimateUserOperationGas throws an error", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    const err = "Simulator error";
    estimateUserOperationGasMock.mockImplementationOnce(() => {
      throw new Error(err);
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    expect(response.statusCode).toBe(500);
    expect(response._getJSONData().error.message.includes(err)).toBe(true);
    expect(response._getJSONData().error.code).toBe(-32002);
    expect(response._getJSONData().id).toBe(requestId);
  });

  test("estimateUserOperationGas returns an error code", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    const errorCode = 123; // whatever is not 200
    estimateUserOperationGasMock.mockReturnValueOnce({
      code: errorCode,
      message: "simulator message",
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    expect(response.statusCode).toBe(400);
    expect(
      response._getJSONData().error.message.includes("simulator message"),
    ).toBe(true);
    expect(response._getJSONData().error.code).toBe(errorCode);
    expect(response._getJSONData().id).toBe(requestId);
  });

  test("can't get gas price for chain id", async () => {
    // chainId = 3 has an entrypoint and simulation service, but gas price service is undefined
    const targetChainId = "3";

    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${targetChainId}/test`,
      params: { chainId: targetChainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    estimateUserOperationGasMock.mockReturnValueOnce({
      code: 200,
      data: {
        callGasLimit: 1000n,
        verificationGasLimit: 1001n,
        preVerificationGas: 1002n,
        validUntil: 1003n,
        validAfter: 1004n,
      },
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    expect(response.statusCode).toBe(400);
    expect(
      response
        ._getJSONData()
        .error.message.startsWith("Don't know how to fetch gas price"),
    ).toBe(true);
    expect(response._getJSONData().id).toBe(requestId);
  });

  test("fetch gas price throws an error", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [
          {}, // userOp
          entryPointAddress,
          {}, // stateOverrideSet
        ],
      },
    };

    // Mock responses from other services
    estimateUserOperationGasMock.mockReturnValueOnce({
      code: 200,
      data: {
        callGasLimit: 1000n,
        verificationGasLimit: 1001n,
        preVerificationGas: 1002n,
        validUntil: 1003n,
        validAfter: 1004n,
      },
    });

    const err = "Gas price error";
    getGasPriceMock.mockImplementationOnce(() => {
      throw new Error(err);
    });

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await estimateUserOperationGas(request, response);

    // console.log(response._getJSONData());

    expect(response.statusCode).toBe(500);
    expect(response._getJSONData().error.message.includes(err)).toBe(true);
    expect(response._getJSONData().error.code).toBe(-32002);
    expect(response._getJSONData().id).toBe(requestId);
  });
});
