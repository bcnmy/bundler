/* eslint-disable no-console */
import { Command } from "commander";
import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

// Load environment variables from .env file
config();

/**
 * Usage:
 *  yarn admin-cli cancel \
 *  --bundler-url https://bundler.biconomy.io
 *  --private-key <private-key> \
 *  --chain-id <chain-id> \
 *  --relayer-address <relayer-address> \
 *  --nonce <nonce>
 */
async function main() {
  const program = new Command();

  program
    .requiredOption(
      "-b, --bundler-url <url>",
      "Bundler URL",
      process.env.BUNDLER_URL,
    )
    .requiredOption(
      "-k, --private-key <key>",
      "Private key",
      process.env.PRIVATE_KEY,
    )
    .requiredOption("-c, --chain-id <id>", "Chain ID", parseInt)
    .requiredOption("-r, --relayer-address <address>", "Relayer address")
    .requiredOption("-n, --nonce <nonce>", "Nonce", parseInt)
    .parse(process.argv);

  const options = program.opts();

  console.log(`Bundler URL: ${options.bundlerUrl}`);
  console.log(`Private key: ${options.privateKey.substring(0, 6)}...`); // Only show the first 6 characters for security

  // now create a viem account from the private key
  const account = privateKeyToAccount(
    options.privateKey.startsWith("0x")
      ? options.privateKey
      : `0x${options.privateKey}`,
  );
  console.log(`Admin address: ${account.address}`);

  const requestBody = {
    adminAddress: account.address,
    chainId: options.chainId,
    relayerAddress: options.relayerAddress,
    nonce: options.nonce,
  };

  const message = JSON.stringify(requestBody);
  console.log(`Message: ${message}`);

  const signature = await account.signMessage({ message });
  console.log(`Signature: ${signature}`);

  // join the base bundler URL with the path /admin/cancel
  const url = new URL(options.bundlerUrl);
  url.pathname = "/admin/cancel";
  console.log(`Making a request to URL: ${url.toString()}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: signature,
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`Response status: ${response.status}`);
  console.log(`Response status text: ${response.statusText}`);

  // Read and log the response body
  const responseBody = await response.text();
  console.log(`Response body: ${responseBody}`);

  // If the response is JSON, we can parse and log it in a more readable format
  try {
    const jsonBody = JSON.parse(responseBody);
    console.log("Parsed JSON response:");
    console.log(JSON.stringify(jsonBody, null, 2));
  } catch (error) {
    // If parsing fails, it's not JSON, so we've already logged it as text
    console.log("Response is not JSON");
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
