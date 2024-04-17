import httpMocks, { RequestOptions } from "node-mocks-http";
import { getChainId } from "./handler";

const chainId = "80001";
const requestId = "123";

describe("eth_chainId", () => {
  it("should return chainId in hex if the chain is supported", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/${chainId}/test`,
      params: { chainId },
      body: {
        id: requestId,
        params: [],
      },
    };

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await getChainId(request, response);

    // console.log(response._getJSONData());

    // Check the returned values
    expect(response.statusCode).toBe(200);
    expect(response._getJSONData()).toEqual({
      jsonrpc: "2.0",
      id: "123",
      result: "0x13881", // 80001 in hex
    });
  });

  it("should return an error if the chain is not supported", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "POST",
      url: `/api/v2/unknown/test`,
      params: { chainId: "unknown" },
      body: {
        id: requestId,
        params: [],
      },
    };

    // Send the request
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();
    await getChainId(request, response);

    // console.log(response._getJSONData());

    // Check the returned values
    expect(response.statusCode).toBe(404);
  });
});
