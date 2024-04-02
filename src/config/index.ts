/* eslint-disable import/no-import-module-exports */
import crypto from "crypto-js";
import fs, { existsSync } from "fs";
import _, { isNumber } from "lodash";
import nodeconfig from "config";
import { logger } from "../common/logger";

import { ConfigType, IConfig } from "./interface/IConfig";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

// A part of our config is encrypted and other part is not. This function merges the decrypted part with the rest of the config.
export function mergeWithDecryptedConfig(
  decryptedConfig: Partial<ConfigType>,
): ConfigType {
  const merged = nodeconfig.util.toObject();

  // We always take the relayer secrets from the old, decrypted config
  if (decryptedConfig.relayerManagers) {
    for (let i = 0; i < merged.relayerManagers.length; i += 1) {
      merged.relayerManagers[i].relayerSeed =
        decryptedConfig.relayerManagers[i].relayerSeed;

      merged.relayerManagers[i].ownerAddress =
        decryptedConfig.relayerManagers[i].ownerAddress;

      merged.relayerManagers[i].ownerPrivateKey =
        decryptedConfig.relayerManagers[i].ownerPrivateKey;
    }
  } else {
    throw new Error(`Relayer managers not configured in the encrypted config file.
    💡 HINT: Make sure that the relayerManagers property exists in config.json, contains the relayerSeed and ownerAccountDetails, and re-run ts-node encrypt-config.ts`);
  }

  return merged;
}

export class Config implements IConfig {
  config: ConfigType;

  // eslint-disable-next-line class-methods-use-this
  decryptConfig(): string {
    const encryptedEnvPath =
      process.env.BUNDLER_CONFIG_PATH || "./config.json.enc";

    const passphrase = process.env.BUNDLER_CONFIG_PASSPHRASE;
    if (!passphrase) {
      throw new Error(
        "BUNDLER_CONFIG_PASSPHRASE environment variable required",
      );
    }

    if (!existsSync(encryptedEnvPath)) {
      throw new Error(`Invalid ENV Path: ${encryptedEnvPath}`);
    }
    const ciphertext = fs.readFileSync(encryptedEnvPath, "utf8");

    try {
      // First 44 bits are Base64 encodded HMAC
      const hashInBase64 = ciphertext.substr(0, 44);

      // Next 32 bits are the salt
      const salt = crypto.enc.Hex.parse(ciphertext.substr(44, 32));

      // Next 32 bits are the initialization vector
      const iv = crypto.enc.Hex.parse(ciphertext.substr(44 + 32, 32));

      // Rest is encrypted .env
      const encrypted = ciphertext.substr(44 + 32 + 32);

      // Derive key from passphrase
      const key = crypto.PBKDF2(passphrase, salt, {
        keySize: KEY_SIZE / 32,
        iterations: PBKDF2_ITERATIONS,
      });

      const bytes = crypto.AES.decrypt(encrypted, key, {
        iv,
        padding: AES_PADDING,
        mode: AES_MODE,
      });

      const plaintext = bytes.toString(crypto.enc.Utf8);

      // Verify HMAC
      const decryptedHmac = crypto.HmacSHA256(plaintext, key);
      const decryptedHmacInBase64 = crypto.enc.Base64.stringify(decryptedHmac);

      if (decryptedHmacInBase64 !== hashInBase64) {
        throw new Error("Error: HMAC does not match");
      }
      return plaintext;
    } catch (e) {
      const wrappedError = new Error(
        `Config decryption failed (check your BUNDLER_CONFIG_PASSPHRASE): ${e}`,
      );
      log.error(wrappedError);
      throw wrappedError;
    }
  }

  constructor() {
    log.info("Config loading started");
    try {
      // decrypt the config and load it
      const plaintext = this.decryptConfig();
      const data = JSON.parse(plaintext) as ConfigType;

      this.config = mergeWithDecryptedConfig(data);

      // check if BUNDLER_CHAIN_ID is set, if true override the supportedNetworks
      // This exists to easily support single chain per bundler for TW
      const chainId = parseInt(process.env.BUNDLER_CHAIN_ID || "", 10);
      if (chainId) {
        this.config.supportedNetworks = [chainId];
      }

      this.validate();

      log.info("Config loaded successfully");
    } catch (error) {
      log.error("Config loading failed", error);
      throw error;
    }
  }

  validate(): boolean {
    // check for each supported networks if the config is valid
    for (const chainId of this.config.supportedNetworks) {
      if (!this.config.supportedTransactionType[chainId].length) {
        throw new Error(
          `No supported transaction type for chain id ${chainId}`,
        );
      }

      if (!this.config.chains.currency[chainId]) {
        throw new Error(`Currency required for chain id ${chainId}`);
      }

      if (!this.config.chains.providers[chainId]) {
        throw new Error(`Provider required for chain id ${chainId}`);
      }

      if (!this.config.chains.decimal[chainId]) {
        throw new Error(`Decimals required for chain id ${chainId}`);
      }

      if (!isNumber(this.config.relayer.nodePathIndex)) {
        throw new Error("Relayer node path index required");
      }

      if (!this.config.relayerManagers.length) {
        throw new Error(`Relayer manager required for chain id ${chainId}`);
      }
    }
    return true;
  }

  update(data: object): boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): ConfigType {
    return this.config;
  }

  active(): boolean {
    return !!this.config.queueUrl;
  }
}

export const configInstance = new Config();
export const config = configInstance.get();
