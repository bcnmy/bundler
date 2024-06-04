import httpMocks, { RequestOptions } from "node-mocks-http";

// Set statusService to undefined to simulate the service not being initialized
jest.mock("../../../../common/service-manager", () => ({
  statusService: undefined,
}));

// This has to happen after jest.mock or the import won't be mocked
// eslint-disable-next-line import/first
import { startupProbe } from "./handler";

describe("/startup", () => {
  it("should return 503 if the status service is not initialized YET", async () => {
    // Create the RPC request
    const requestOptions: RequestOptions = {
      method: "GET",
      url: `/api/admin/startup`,
    };

    const request = httpMocks.createRequest(requestOptions);
    const response = httpMocks.createResponse();

    await startupProbe(request, response);

    expect(response.statusCode).toBe(503);

    expect(response._getJSONData()).toEqual({
      ok: false,
      errors: [],
    });
  });
});
