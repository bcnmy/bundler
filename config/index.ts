/* eslint-disable no-console */
/* eslint-disable import/no-import-module-exports */
import crypto from 'crypto-js';
import fs, { existsSync } from 'fs';
import _, { isNumber } from 'lodash';
import path from 'path';
import { ChainId } from '@biconomy/core-types';
import { logger } from '../common/logger';

import { ConfigType, IConfig } from './interface/IConfig';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

function getEnvMinRelayerCount(): number {
  if (process.env.MIN_RELAYER_COUNT) {
    return parseInt(process.env.MIN_RELAYER_COUNT, 10);
  }
  return 0;
}

function getEnvMaxRelayerCount(): number {
  if (process.env.MAX_RELAYER_COUNT) {
    return parseInt(process.env.MAX_RELAYER_COUNT, 10);
  }
  return 0;
}

function getEnvfundingBalanceThreshold(): number {
  if (process.env.FUNDING_BALANCE_THRESHOLD) {
    return parseFloat(process.env.FUNDING_BALANCE_THRESHOLD);
  }
  return 0;
}

function getEnvfundingRelayerAmount(): number {
  if (process.env.FUNDING_RELAYER_AMOUNT) {
    return parseFloat(process.env.FUNDING_RELAYER_AMOUNT);
  }
  return 0;
}

function getJsonFromEnvVariable(envVariableName: string): any {
  const jsonString = process.env[envVariableName];

  if (!jsonString) {
    throw new Error(`Environment variable ${envVariableName} is not defined or empty.`);
  }

  try {
    const jsonObject = JSON.parse(jsonString);
    console.log(jsonObject);
    return jsonObject;
  } catch (error: any) {
    throw new Error(`Error parsing JSON from ${envVariableName}: ${error.message}`);
  }
}


function getEnvVariable(envVariableName: string): string {
  const value = process.env[envVariableName];

  if (!value) {
    throw new Error(`Environment variable ${envVariableName} is not defined or empty.`);
  }

  return value
}

export class Config implements IConfig {
  config: ConfigType;

  readEnvVariables() {
    console.log('Reading env Variables');
    const slackConfig = getJsonFromEnvVariable('SLACK_JSON');
    const simulationDataConfig = getJsonFromEnvVariable('SIMULATION_DATA_JSON');
    const dataSourcesConfig = getJsonFromEnvVariable('DATASOURCES_JSON');
    const socketServiceConfig = getJsonFromEnvVariable('SOCKET_SERVICE_JSON');
    const providerConfig = getJsonFromEnvVariable('PROVIDER_JSON');
    const tokenPriceConfig = getJsonFromEnvVariable('TOKEN_PRICE_JSON');


    this.config.queueUrl = getEnvVariable('QUEUE_URL');


    this.config.chains.provider = providerConfig;
    this.config.dataSources = dataSourcesConfig;
    this.config.socketService = socketServiceConfig;
    this.config.slack = slackConfig;
    this.config.simulationData = simulationDataConfig;
    this.config.tokenPrice = _.merge(this.config.tokenPrice, tokenPriceConfig);

    // this.config.tokenPrice = tokenPriceConfig;
    const chainId = parseInt(process.env.CHAIN_ID as string, 10);
    console.log(`CHAIN ID <${process.env.CHAIN_ID}>`);

    const supportedNetworks = [chainId];
    this.config.supportedNetworks = supportedNetworks;
    console.log(`PROVIDER URL <${this.config.chains.provider[chainId]}>`);

    this.config.relayer = { nodePathIndex: parseInt(process.env.NODE_PATH_INDEX as string, 10) };

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
      if (!relayerManager.ownerAccountDetails[chainId]) {
        log.info(`Default ownerAccoutnDetails couldnt be found for ${chainId}`);
        relayerManager.ownerAccountDetails[chainId] = { 'privateKey': relayerManager.ownerPrivateKey, 'publicKey': relayerManager.ownerPublicKey };
      } else {
        log.info(`Default ownerAccoutnDetails found for ${chainId}`);
      }
    }


    const relayerManager = this.config.relayerManagers[0];
    log.info(`RelayarManager ${relayerManager.name} publicKey <${relayerManager.ownerAccountDetails[chainId].publicKey}>`);
    log.info(`RelayarManager ${relayerManager.name} Min relayer count <${relayerManager.minRelayerCount[chainId]}>`);
    log.info(`RelayarManager ${relayerManager.name} Max relayer count <${relayerManager.maxRelayerCount[chainId]}>`);
    log.info(`RelayarManager ${relayerManager.name} fundingBalanceThreshold  <${relayerManager.fundingBalanceThreshold[chainId]}>`);
    log.info(`RelayarManager ${relayerManager.name} fundingRelayerAmount <${relayerManager.fundingRelayerAmount[chainId]}>`);
    log.info('Reading env Variables completed');
  }

  decryptConfig(): string {
    const encryptedEnvPath = './config.json.enc';
    const passphrase = process.env.CONFIG_PASSPHRASE;
    if (!passphrase) {
      throw new Error('Passphrase for config required in .env file');
    }

    if (!existsSync(encryptedEnvPath)) {
      throw new Error(`Invalid ENV Path: ${encryptedEnvPath}`);
    }
    const ciphertext = fs.readFileSync(encryptedEnvPath, 'utf8');
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
      log.error('Incorrect password for decryption');
      process.exit();
    }


    // Verify HMAC
    const decryptedHmac = crypto.HmacSHA256(plaintext, key);
    const decryptedHmacInBase64 = crypto.enc.Base64.stringify(decryptedHmac);

    if (decryptedHmacInBase64 !== hashInBase64) {
      throw new Error('Error: HMAC does not match');
    }
    return plaintext;
  }

  constructor() {
    log.info('Config loading started');
    try {
      // decrypt the config and load it
      const plaintext = this.decryptConfig();
      const data = JSON.parse(plaintext) as ConfigType;
      const staticConfig = JSON.parse(fs.readFileSync(path.resolve('./config/static-config.json'), 'utf8'));

      this.config = _.merge(data, staticConfig);
      this.readEnvVariables();
      this.validate();
      // Setting up supportTed network from env variable if avaialable
      // this will come from env variable
    } catch (error) {
      log.error('Config constructor failed', error);
      throw error;
    }
  }

  validate(): boolean {
    const { supportedNetworks } = this.config;
    // check for each supported networks if the config is valid
    console.log(`Supported networks <${supportedNetworks}>`);

    for (const chainId of supportedNetworks) {
      if (!this.config.supportedTransactionType[chainId].length) {
        throw new Error(`No supported transaction type for chain id ${chainId}`);
      }

      // check for chains config
      if (!this.config.chains.premium[chainId]) {
        throw new Error(`Premium value required for chain id ${chainId}`);
      }

      if (!this.config.chains.currency[chainId]) {
        throw new Error(`Currency required for chain id ${chainId}`);
      }

      if (!this.config.chains.decimal[chainId]) {
        throw new Error(`Decimals required for chain id ${chainId}`);
      }
      if (!this.config.chains.retryTransactionInterval[chainId]) {
        throw new Error(`Retry transaction interval required for chain id ${chainId}`);
      }

      if (!this.config.entryPointData[chainId].length) {
        throw new Error(`Entry point data address required for chain id ${chainId}`);
      }

      const nodePathIndex = process.env.NODE_PATH_INDEX;
      console.log(`Node path index <${nodePathIndex}>`);

      if (!nodePathIndex) {
        console.log(process.env);

        throw new Error('Relayer node path index required');
      }

      // Env variable will always be a string
      // if (!isNumber(nodePathIndex)) {
      //   throw new Error('integer Relayer node path index required');
      // }

      if (!this.config.relayerManagers.length) {
        throw new Error(`Relayer manager required for chain id ${chainId}`);
      }

      // check valid gas price config
      if (!this.config.gasPrice[chainId]) {
        throw new Error(`Gas price configuration required for chain id ${chainId}`);
      }
      if (!this.config.gasPrice[chainId].updateFrequencyInSeconds) {
        throw new Error(`Gas price update frequency required for chain id ${chainId}`);
      }
      if (!this.config.gasPrice[chainId].updateFrequencyInSeconds) {
        throw new Error(`Gas price update frequency required for chain id ${chainId}`);
      }
      if (!this.config.gasPrice[chainId].maxGasPrice) {
        throw new Error(`Max gas price required for chain id ${chainId}`);
      }
      if (!this.config.gasPrice[chainId].minGasPrice) {
        throw new Error(`Min gas price required for chain id ${chainId}`);
      }
      if (!this.config.gasPrice[chainId].baseFeeMultiplier) {
        throw new Error(`Gas price base fee multiplier required for chain id ${chainId}`);
      }

      // check valid fee options config
      if (!this.config.feeOption.supportedFeeTokens[chainId].length) {
        throw new Error(`Supported fee tokens required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.similarTokens[chainId].length) {
        throw new Error(`Similar tokens required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.offset[chainId]) {
        throw new Error(`Offset required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.logoUrl[chainId]) {
        throw new Error(`Logo url required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.tokenContractAddress[chainId]) {
        throw new Error(`Token contract address required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.decimals[chainId]) {
        throw new Error(`Decimals required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.feeTokenTransferGas[chainId]) {
        throw new Error(`Decimals required for chain id ${chainId}`);
      }
      if (!this.config.feeOption.refundReceiver[chainId]) {
        throw new Error(`Refund receiver required for chain id ${chainId}`);
      }

      if (!this.config.tokenPrice.coinMarketCapApi) {
        throw new Error('Coin market cap API required');
      }
      if (!this.config.tokenPrice.networkSymbols) {
        throw new Error('Network symbols required');
      }
      if (!this.config.tokenPrice.updateFrequencyInSeconds) {
        throw new Error('Token price update frequency required');
      }
      if (!this.config.tokenPrice.symbolMapByChainId[chainId]) {
        throw new Error(`Symbol map required for chain id ${chainId}`);
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
