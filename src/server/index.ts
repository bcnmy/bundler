/* eslint-disable import/no-import-module-exports */
/* eslint-disable import/first */
require("dotenv").config({ path: `${__dirname}/../../.env` });

import tracer from "dd-trace";
import { getLogger } from "../common/logger";
import { configInstance } from "../config";

tracer.init({ logInjection: false });

const log = getLogger(module);

(async () => {
  if (configInstance.active()) {
    const server = await import("./server");
    server.init();
  } else {
    log.info("Config not active");
  }
})();
