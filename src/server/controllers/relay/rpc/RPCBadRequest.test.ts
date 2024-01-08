import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";
import { RPCBadRequest } from "./RPCBadRequest";

describe("RPCBadRequest", () => {
  it("serializes correctly", () => {
    const id = 5;
    const errMessage = "test error";

    const response = new RPCBadRequest(id, errMessage);
    expect(response).toEqual({
      error: {
        code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
        message: errMessage,
      },
      id,
      jsonprc: "2.0",
    });
  });
});
