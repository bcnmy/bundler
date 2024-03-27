import _ from "lodash";
import { TransactionReceipt } from "viem";

/**
 * numbersToStrings is a helper function to convert all numbers and native bigints in an object to hex strings.
 * @param obj any JS object
 * @returns a deep clone of the object with all numbers converted to hex strings
 */
function numbersToStrings(obj: any): any {
  const clone = _.cloneDeep(obj);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "bigint") {
      clone[key] = `0x${value.toString(16)}`;
    }
    if (typeof value === "number") {
      clone[key] = `0x${value.toString(16)}`;
    }
    if (Array.isArray(value)) {
      clone[key] = value.map((v) => numbersToStrings(v));
    } else if (value !== null && typeof value === "object") {
      clone[key] = numbersToStrings(value);
    }
  }

  return clone;
}
/**
 * serializeTransactionReceipt takes a "parsed" TransactionReceipt object and converts it to a raw (unparsed) object.
 * This is to ensure the API is backwards compatible, because we didn't use viem before, and viem does some internal parsing that's not standard for raw RPC responses.
 * @param receipt viem TransactionReceipt returned by waitForTransactionReceipt
 * @returns raw (unparsed) transaction receipt object
 */
export function serializeTransactionReceipt(receipt: TransactionReceipt): any {
  const clone = numbersToStrings(_.cloneDeep(receipt));

  // Convert parsed statuses to status hex codes
  switch (clone.status) {
    case "success": {
      clone.status = "0x1";
      break;
    }
    case "reverted": {
      clone.status = "0x0";
      break;
    }
    default: {
      break;
    }
  }

  // Convert parsed transaction types to type hex codes
  switch (clone.type) {
    case "legacy": {
      clone.type = "0x0";
      break;
    }
    case "eip2930": {
      clone.type = "0x1";
      break;
    }
    case "eip1559": {
      clone.type = "0x2";
      break;
    }
    case "eip4844": {
      clone.type = "0x3";
      break;
    }
    default: {
      break;
    }
  }

  return clone;
}
