import { parseError } from "../../../../common/utils";
import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";
import { RPCInternalServerError } from "./RPCInternalServerError";

describe("RPCInternalServerError", () => {
  it("serializes correctly", () => {
    const err = new Error("test error");
    const response = new RPCInternalServerError(1, err);
    expect(response).toEqual({
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(err)}`,
      },
      id: 1,
      jsonprc: "2.0",
    });
  });
});
