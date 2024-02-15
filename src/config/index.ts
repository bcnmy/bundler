/* eslint-disable import/no-import-module-exports */
import crypto from "crypto-js";
import fs, { existsSync } from "fs";
import _, { isNumber } from "lodash";
import path from "path";
import { logger } from "../common/logger";

import { ConfigType, IConfig } from "./interface/IConfig";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

function getEnvMinRelayerCount(): number {
  if (process.env.BUNDLER_MIN_RELAYER_COUNT) {
    return parseInt(process.env.BUNDLER_MIN_RELAYER_COUNT, 10);
  }
  return 0;
}

function getEnvMaxRelayerCount(): number {
  if (process.env.BUNDLER_MAX_RELAYER_COUNT) {
    return parseInt(process.env.BUNDLER_MAX_RELAYER_COUNT, 10);
  }
  return 0;
}

function getEnvfundingBalanceThreshold(): number {
  if (process.env.BUNDLER_FUNDING_BALANCE_THRESHOLD) {
    return parseFloat(process.env.BUNDLER_FUNDING_BALANCE_THRESHOLD);
  }
  return 0;
}

function getEnvfundingRelayerAmount(): number {
  if (process.env.BUNDLER_FUNDING_RELAYER_AMOUNT) {
    return parseFloat(process.env.BUNDLER_FUNDING_RELAYER_AMOUNT);
  }
  return 0;
}

function getJsonFromEnvVariable(envVariableName: string): any {
  const jsonString = process.env[envVariableName];

  if (!jsonString) {
    throw new Error(
      `Environment variable ${envVariableName} is not defined or empty.`,
    );
  }

  try {
    const jsonObject = JSON.parse(jsonString);
    return jsonObject;
  } catch (error: any) {
    throw new Error(
      `Error parsing JSON from ${envVariableName}: ${error.message}`,
    );
  }
}

function getEnvVariable(envVariableName: string): string {
  const value = process.env[envVariableName];

  if (!value) {
    throw new Error(
      `Environment variable ${envVariableName} is not defined or empty.`,
    );
  }

  return value;
}

export function merge(
  userConfig: Partial<ConfigType>,
  staticConfig: any,
): ConfigType {
  // clone so we don't mutate the original config
  const clone = _.cloneDeep(userConfig);

  // preserve the supported networks from the user config because
  // we want to override the default from static-config if it's present in the user config
  const supportedNetworks = _.clone(clone.supportedNetworks);

  // perform the merge
  const merged = _.merge(clone, staticConfig);

  // restore the supported networks array
  if (supportedNetworks && supportedNetworks.length) {
    merged.supportedNetworks = supportedNetworks;
  }

  return merged;
}

export class Config implements IConfig {
  config: ConfigType;

  readEnvVariables() {
    log.info("Reading env Variables");
    const slackConfig = getJsonFromEnvVariable("BUNDLER_SLACK_JSON");
    const simulationDataConfig = getJsonFromEnvVariable(
      "BUNDLER_SIMULATION_DATA_JSON",
    );
    const dataSourcesConfig = getJsonFromEnvVariable(
      "BUNDLER_DATASOURCES_JSON",
    );
    const socketServiceConfig = getJsonFromEnvVariable(
      "BUNDLER_SOCKET_SERVICE_JSON",
    );
    const providerConfig = getJsonFromEnvVariable("BUNDLER_PROVIDER_JSON");
    const tokenPriceConfig = getJsonFromEnvVariable("BUNDLER_TOKEN_PRICE_JSON");
    const fallbackProviderConfig = getJsonFromEnvVariable(
      "BUNDLER_FALLBACK_PROVIDER_JSON",
    );

    this.config.queueUrl = getEnvVariable("BUNDLER_QUEUE_URL");

    this.config.chains.provider = providerConfig;
    this.config.dataSources = dataSourcesConfig;
    this.config.socketService = socketServiceConfig;
    this.config.slack = slackConfig;
    this.config.simulationData = simulationDataConfig;
    this.config.tokenPrice = _.merge(this.config.tokenPrice, tokenPriceConfig);
    this.config.fallbackProviderConfig = fallbackProviderConfig;
    this.config.isTWSetup =
      getEnvVariable("BUNDLER_IS_TRUSTWALLET_SETUP") === "true";

    // this.config.tokenPrice = tokenPriceConfig;
    const chainId = parseInt(process.env.BUNDLER_CHAIN_ID as string, 10);
    log.info(`CHAIN ID <${process.env.BUNDLER_CHAIN_ID}>`);

    const supportedNetworks = [chainId];
    this.config.supportedNetworks = supportedNetworks;
    // log.info(`PROVIDER URL <${this.config.chains.provider[chainId]}>`);

    this.config.relayer = {
      nodePathIndex: parseInt(
        process.env.BUNDLER_NODE_PATH_INDEX as string,
        10,
      ),
    };

    // rest of the params in .env file in being read by code directly
    // not from the config.
    // REDIS_URL, MONGO_URL, QUEUE_URL, CONFIG_PASSPHRASE, NODE_PATH_INDEX
    // TENDERLY_USER. TENDERLY_PROJECT, TENDERLY_KEY
    for (const relayerManager of this.config.relayerManagers) {
      const minRelayerCount = getEnvMinRelayerCount();
      const maxRelayerCount = getEnvMaxRelayerCount();
      const fundingBalanceThreshold = getEnvfundingBalanceThreshold();
      const fundingRelayerAmount = getEnvfundingRelayerAmount();

      relayerManager.minRelayerCount[chainId] = minRelayerCount;
      relayerManager.maxRelayerCount[chainId] = maxRelayerCount;
      relayerManager.fundingBalanceThreshold[chainId] = fundingBalanceThreshold;
      relayerManager.fundingRelayerAmount[chainId] = fundingRelayerAmount;
    }

    const relayerManager = this.config.relayerManagers[0];
    log.info(
      `RelayarManager ${relayerManager.name} publicKey <${relayerManager.ownerPublicKey}>`,
    );

    log.info(
      `RelayarManager ${relayerManager.name} Min relayer count <${relayerManager.minRelayerCount[chainId]}>`,
    );
    log.info(
      `RelayarManager ${relayerManager.name} Max relayer count <${relayerManager.maxRelayerCount[chainId]}>`,
    );
    log.info(
      `RelayarManager ${relayerManager.name} fundingBalanceThreshold  <${relayerManager.fundingBalanceThreshold[chainId]}>`,
    );
    log.info(
      `RelayarManager ${relayerManager.name} fundingRelayerAmount <${relayerManager.fundingRelayerAmount[chainId]}>`,
    );
    log.info("Reading env Variables completed");
  }

  // eslint-disable-next-line class-methods-use-this
  decryptConfig(): string {
    const encryptedEnvPath = "./config.json.enc";
    const passphrase = process.env.BUNDLER_CONFIG_PASSPHRASE;
    if (!passphrase) {
      throw new Error("Passphrase for config required in .env file");
    }

    if (!existsSync(encryptedEnvPath)) {
      throw new Error(`Invalid ENV Path: ${encryptedEnvPath}`);
    }
    const ciphertext = fs.readFileSync(encryptedEnvPath, "utf8");
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

    let plaintext;
    try {
      const encryptedBytes = crypto.AES.decrypt(encrypted, key, {
        iv,
        padding: AES_PADDING,
        mode: AES_MODE,
      });
      plaintext = encryptedBytes.toString(crypto.enc.Utf8);
    } catch (e) {
      log.error("Incorrect password for decryption");
      process.exit();
    }

    // Verify HMAC
    const decryptedHmac = crypto.HmacSHA256(plaintext, key);
    const decryptedHmacInBase64 = crypto.enc.Base64.stringify(decryptedHmac);

    if (decryptedHmacInBase64 !== hashInBase64) {
      throw new Error("Error: HMAC does not match");
    }
    return plaintext;
  }

  constructor() {
    log.info("Config loading started");
    try {
      // decrypt the config and load it
      const plaintext = this.decryptConfig();
      const data = JSON.parse(plaintext) as ConfigType;
      const staticConfig = JSON.parse(
        fs.readFileSync(path.resolve("src/config/static-config.json"), "utf8"),
      );

      this.config = merge(data, staticConfig);
      this.readEnvVariables();
      this.validate();
      // Setting up supportTed network from env variable if avaialable
      // this will come from env variable
    } catch (error) {
      log.error("Config constructor failed", error);
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
      if (!this.config.chains.provider[chainId]) {
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
    this.config = merge(this.config, data);
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
