import { BUNDLER_VALIDATION_STATUSES } from "../../../middleware";
import { RPCBadRequest, RPCInternalServerError } from "./helpers";
import { parseError } from "../../../../common/utils";

describe("BundlerRelayHelpers", () => {
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
});
