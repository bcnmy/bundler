import httpMocks, { RequestOptions } from "node-mocks-http";

const checkChain = jest.fn();

jest.mock("../../../../common/service-manager", () => ({
  statusService: {
    checkChain,
  },
}));

// eslint-disable-next-line import/first
import { health } from "./handler";

// The tests for this endpoint are quite minimal and simple.
// The endpoint should just return whatever the StatusService returns.
describe("/health/:chainId", () => {
  const requestOptions: RequestOptions = {
    method: "GET",
    url: "/admin/health/:chainId",
    params: { chainId: 137 },
  };

  it("should return 200 if the StatusService returns no errors", async () => {
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();

    const statusResponse = {
      chainId: 137,
      healthy: true,
      errors: [],
    };
    checkChain.mockReturnValueOnce(statusResponse);

    await health(request, response);

    expect(response.statusCode).toBe(200);
    expect(response._getJSONData()).toEqual(statusResponse);
  });

  it("should return 500 if the StatusService returns errors", async () => {
    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();

    const statusResponse = {
      chainId: 137,
      healthy: false,
      errors: ["the server is burning 🔥"],
    };
    checkChain.mockReturnValueOnce(statusResponse);

    await health(request, response);

    expect(response.statusCode).toBe(500);
    expect(response._getJSONData()).toEqual(statusResponse);
  });
});
