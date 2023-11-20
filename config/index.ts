/* eslint-disable no-await-in-loop */
/* eslint-disable no-case-declarations */
/* eslint-disable import/no-import-module-exports */
import crypto from 'crypto-js';
import fs, { existsSync } from 'fs';
import _, { isNumber } from 'lodash';
import path from 'path';
import axios from 'axios';
import { logger } from '../common/logger';

import { ConfigType, IConfig } from './interface/IConfig';
import { BLOCKCHAINS } from '../common/constants';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

export class Config implements IConfig {
  config: ConfigType;

  constructor() {
    log.info('Config loading started');
    try {
      // decrypt the config and load it
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
        throw new Error('Error: HMAC does not match');
      }
      const data = JSON.parse(plaintext) as ConfigType;
      const staticConfig = JSON.parse(fs.readFileSync(path.resolve('./config/static-config.json'), 'utf8'));

      this.config = _.merge(data, staticConfig);
      this.validate();
    } catch (error) {
      log.error('Config loading failed', error);
      throw error;
    }
  }

  async validate(): Promise<void> {
    // check for each supported networks if the config is valid
    for (const chainId of this.config.supportedNetworks) {
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

      if (!isNumber(this.config.relayer.nodePathIndex)) {
        throw new Error('Relayer node path index required');
      }

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

      await this.checkAndAppendRpcUrls(chainId);
      log.info('Config loaded successfully');
    }
  }

  async checkAndAppendRpcUrls(chainId: number) {
    switch (chainId) {
      case BLOCKCHAINS.ETHEREUM_MAINNET:
        const ethereumRPCUrls = [];
        const { ETHEREUM_ALCHEMY_RPC_URL } = process.env;
        if (typeof ETHEREUM_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('ETHEREUM_ALCHEMY_RPC_URL not set in env');
        }
        ethereumRPCUrls.push(ETHEREUM_ALCHEMY_RPC_URL);

        const { ETHEREUM_INFURA_RPC_URL } = process.env;
        if (typeof ETHEREUM_INFURA_RPC_URL !== 'string') {
          throw new Error('ETHEREUM_INFURA_RPC_URL not set in env');
        }
        ethereumRPCUrls.push(ETHEREUM_INFURA_RPC_URL);

        const { ETHEREUM_PUBLIC_RPC_URL } = process.env;
        if (typeof ETHEREUM_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ETHEREUM_PUBLIC_RPC_URL not set in env');
        }
        ethereumRPCUrls.push(ETHEREUM_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ethereumRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = ETHEREUM_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = ETHEREUM_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ETHEREUM_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.GOERLI:
        const goerliRPCUrls = [];
        const { GOERLI_ALCHEMY_RPC_URL } = process.env;
        if (typeof GOERLI_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('GOERLI_ALCHEMY_RPC_URL not set in env');
        }
        goerliRPCUrls.push(GOERLI_ALCHEMY_RPC_URL);

        const { GOERLI_INFURA_RPC_URL } = process.env;
        if (typeof GOERLI_INFURA_RPC_URL !== 'string') {
          throw new Error('GOERLI_INFURA_RPC_URL not set in env');
        }
        goerliRPCUrls.push(GOERLI_INFURA_RPC_URL);

        const { GOERLI_PUBLIC_RPC_URL } = process.env;
        if (typeof GOERLI_PUBLIC_RPC_URL !== 'string') {
          throw new Error('GOERLI_PUBLIC_RPC_URL not set in env');
        }
        goerliRPCUrls.push(GOERLI_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(goerliRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = GOERLI_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = GOERLI_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = GOERLI_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.POLYGON_MAINNET:
        const polygonRPCUrls = [];
        const { POLYGON_ALCHEMY_RPC_URL } = process.env;
        if (typeof POLYGON_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('POLYGON_ALCHEMY_RPC_URL not set in env');
        }
        polygonRPCUrls.push(POLYGON_ALCHEMY_RPC_URL);

        const { POLYGON_INFURA_RPC_URL } = process.env;
        if (typeof POLYGON_INFURA_RPC_URL !== 'string') {
          throw new Error('POLYGON_INFURA_RPC_URL not set in env');
        }
        polygonRPCUrls.push(POLYGON_INFURA_RPC_URL);

        const { POLYGON_POKT_RPC_URL } = process.env;
        if (typeof POLYGON_POKT_RPC_URL !== 'string') {
          throw new Error('POLYGON_POKT_RPC_URL not set in env');
        }
        polygonRPCUrls.push(POLYGON_POKT_RPC_URL);

        const { POLYGON_PUBLIC_RPC_URL } = process.env;
        if (typeof POLYGON_PUBLIC_RPC_URL !== 'string') {
          throw new Error('POLYGON_PUBLIC_RPC_URL not set in env');
        }
        polygonRPCUrls.push(POLYGON_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(polygonRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = POLYGON_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = POLYGON_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].POKT.rpcUrl = POLYGON_POKT_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = POLYGON_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.POLYGON_MUMBAI:
        const mumbaiRPCUrls = [];
        const { MUMBAI_ALCHEMY_RPC_URL } = process.env;
        if (typeof MUMBAI_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('MUMBAI_ALCHEMY_RPC_URL not set in env');
        }
        mumbaiRPCUrls.push(MUMBAI_ALCHEMY_RPC_URL);

        const { MUMBAI_INFURA_RPC_URL } = process.env;
        if (typeof MUMBAI_INFURA_RPC_URL !== 'string') {
          throw new Error('MUMBAI_INFURA_RPC_URL not set in env');
        }
        mumbaiRPCUrls.push(MUMBAI_INFURA_RPC_URL);

        const { MUMBAI_POKT_RPC_URL } = process.env;
        if (typeof MUMBAI_POKT_RPC_URL !== 'string') {
          throw new Error('MUMBAI_POKT_RPC_URL not set in env');
        }
        mumbaiRPCUrls.push(MUMBAI_POKT_RPC_URL);

        const { MUMBAI_PUBLIC_RPC_URL } = process.env;
        if (typeof MUMBAI_PUBLIC_RPC_URL !== 'string') {
          throw new Error('MUMBAI_PUBLIC_RPC_URL not set in env');
        }
        mumbaiRPCUrls.push(MUMBAI_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(mumbaiRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = MUMBAI_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = MUMBAI_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].POKT.rpcUrl = MUMBAI_POKT_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = MUMBAI_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.POLYGON_ZKEVM_TESTNET:
        const polygonZKEVMTestnetRPCUrls = [];
        const { POLYGON_ZKEVM_TESTNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof POLYGON_ZKEVM_TESTNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('POLYGON_ZKEVM_TESTNET_ALCHEMY_RPC_URL not set in env');
        }
        polygonZKEVMTestnetRPCUrls.push(POLYGON_ZKEVM_TESTNET_ALCHEMY_RPC_URL);

        const { POLYGON_ZKEVM_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof POLYGON_ZKEVM_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('POLYGON_ZKEVM_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        polygonZKEVMTestnetRPCUrls.push(POLYGON_ZKEVM_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(polygonZKEVMTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = POLYGON_ZKEVM_TESTNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = POLYGON_ZKEVM_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.POLYGON_ZKEVM_MAINNET:
        const polygonZKEVMMainnetRPCUrls = [];
        const { POLYGON_ZKEVM_MAINNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof POLYGON_ZKEVM_MAINNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('POLYGON_ZKEVM_MAINNET_ALCHEMY_RPC_URL not set in env');
        }
        polygonZKEVMMainnetRPCUrls.push(POLYGON_ZKEVM_MAINNET_ALCHEMY_RPC_URL);

        const { POLYGON_ZKEVM_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof POLYGON_ZKEVM_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('POLYGON_ZKEVM_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        polygonZKEVMMainnetRPCUrls.push(POLYGON_ZKEVM_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(polygonZKEVMMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = POLYGON_ZKEVM_MAINNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = POLYGON_ZKEVM_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.BSC_TESTNET:
        const BSCTestnetRPCUrls = [];
        const { BSC_TESTNET_QUICK_NODE_RPC_URL } = process.env;
        if (typeof BSC_TESTNET_QUICK_NODE_RPC_URL !== 'string') {
          throw new Error('BSC_TESTNET_QUICK_NODE_RPC_URL not set in env');
        }
        BSCTestnetRPCUrls.push(BSC_TESTNET_QUICK_NODE_RPC_URL);

        const { BSC_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof BSC_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('BSC_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        BSCTestnetRPCUrls.push(BSC_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(BSCTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].QUICK_NODE
          .rpcUrl = BSC_TESTNET_QUICK_NODE_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = BSC_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.BSC_MAINNET:
        const BSCMainnetRPCUrls = [];
        const { BSC_MAINNET_QUICK_NODE_RPC_URL } = process.env;
        if (typeof BSC_MAINNET_QUICK_NODE_RPC_URL !== 'string') {
          throw new Error('BSC_MAINNET_QUICK_NODE_RPC_URL not set in env');
        }
        BSCMainnetRPCUrls.push(BSC_MAINNET_QUICK_NODE_RPC_URL);

        const { BSC_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof BSC_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('BSC_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        BSCMainnetRPCUrls.push(BSC_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(BSCMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].QUICK_NODE
          .rpcUrl = BSC_MAINNET_QUICK_NODE_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = BSC_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.ARBITRUM_NOVA_MAINNET:
        const ArbitrumNovaRPCUrls = [];
        const { ARBITRUM_NOVA_ALCHEMY_RPC_URL } = process.env;
        if (typeof ARBITRUM_NOVA_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_NOVA_ALCHEMY_RPC_URL not set in env');
        }
        ArbitrumNovaRPCUrls.push(ARBITRUM_NOVA_ALCHEMY_RPC_URL);

        const { ARBITRUM_NOVA_PUBLIC_RPC_URL } = process.env;
        if (typeof ARBITRUM_NOVA_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_NOVA_PUBLIC_RPC_URL not set in env');
        }
        ArbitrumNovaRPCUrls.push(ARBITRUM_NOVA_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ArbitrumNovaRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = ARBITRUM_NOVA_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ARBITRUM_NOVA_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.ARBITRUM_GOERLI_TESTNET:
        const ArbitrumTestnetRPCUrls = [];
        const { ARBITRUM_TESTNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof ARBITRUM_TESTNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_TESTNET_ALCHEMY_RPC_URL not set in env');
        }
        ArbitrumTestnetRPCUrls.push(ARBITRUM_TESTNET_ALCHEMY_RPC_URL);

        const { ARBITRUM_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof ARBITRUM_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        ArbitrumTestnetRPCUrls.push(ARBITRUM_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ArbitrumTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = ARBITRUM_TESTNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ARBITRUM_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.ARBITRUM_ONE_MAINNET:
        const ArbitrumMainnetRPCUrls = [];
        const { ARBITRUM_MAINNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof ARBITRUM_MAINNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_MAINNET_ALCHEMY_RPC_URL not set in env');
        }
        ArbitrumMainnetRPCUrls.push(ARBITRUM_MAINNET_ALCHEMY_RPC_URL);

        const { ARBITRUM_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof ARBITRUM_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ARBITRUM_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        ArbitrumMainnetRPCUrls.push(ARBITRUM_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ArbitrumMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = ARBITRUM_MAINNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ARBITRUM_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.OPTIMISM_MAINNET:
        const OptimismRPCUrls = [];
        const { OPTIMISM_ALCHEMY_RPC_URL } = process.env;
        if (typeof OPTIMISM_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('OPTIMISM_ALCHEMY_RPC_URL not set in env');
        }
        OptimismRPCUrls.push(OPTIMISM_ALCHEMY_RPC_URL);

        const { OPTIMISM_PUBLIC_RPC_URL } = process.env;
        if (typeof OPTIMISM_PUBLIC_RPC_URL !== 'string') {
          throw new Error('OPTIMISM_PUBLIC_RPC_URL not set in env');
        }
        OptimismRPCUrls.push(OPTIMISM_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(OptimismRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = OPTIMISM_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = OPTIMISM_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.OPTIMISM_GOERLI_TESTNET:
        const OptimismGoerliRPCUrls = [];
        const { OPTIMISM_GOERLI_ALCHEMY_RPC_URL } = process.env;
        if (typeof OPTIMISM_GOERLI_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('OPTIMISM_GOERLI_ALCHEMY_RPC_URL not set in env');
        }
        OptimismGoerliRPCUrls.push(OPTIMISM_GOERLI_ALCHEMY_RPC_URL);

        const { OPTIMISM_GOERLI_PUBLIC_RPC_URL } = process.env;
        if (typeof OPTIMISM_GOERLI_PUBLIC_RPC_URL !== 'string') {
          throw new Error('OPTIMISM_GOERLI_PUBLIC_RPC_URL not set in env');
        }
        OptimismGoerliRPCUrls.push(OPTIMISM_GOERLI_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(OptimismGoerliRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = OPTIMISM_GOERLI_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = OPTIMISM_GOERLI_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.AVALANCHE_TESTNET:
        const AvalancheTestnetRPCUrls = [];
        const { AVALANCHE_TESTNET_QUICK_NODE_RPC_URL } = process.env;
        if (typeof AVALANCHE_TESTNET_QUICK_NODE_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_TESTNET_QUICK_NODE_RPC_URL not set in env');
        }
        AvalancheTestnetRPCUrls.push(AVALANCHE_TESTNET_QUICK_NODE_RPC_URL);

        const { AVALANCHE_TESTNET_POKT_RPC_URL } = process.env;
        if (typeof AVALANCHE_TESTNET_POKT_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_TESTNET_POKT_RPC_URL not set in env');
        }
        AvalancheTestnetRPCUrls.push(AVALANCHE_TESTNET_POKT_RPC_URL);

        const { AVALANCHE_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof AVALANCHE_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        AvalancheTestnetRPCUrls.push(AVALANCHE_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(AvalancheTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].QUICK_NODE
          .rpcUrl = AVALANCHE_TESTNET_QUICK_NODE_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].POKT
          .rpcUrl = AVALANCHE_TESTNET_POKT_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = AVALANCHE_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.AVALANCHE_MAINNET:
        const AvalancheMainnetRPCUrls = [];
        const { AVALANCHE_MAINNET_QUICK_NODE_RPC_URL } = process.env;
        if (typeof AVALANCHE_MAINNET_QUICK_NODE_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_MAINNET_QUICK_NODE_RPC_URL not set in env');
        }
        AvalancheMainnetRPCUrls.push(AVALANCHE_MAINNET_QUICK_NODE_RPC_URL);

        const { AVALANCHE_MAINNET_POKT_RPC_URL } = process.env;
        if (typeof AVALANCHE_MAINNET_POKT_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_MAINNET_POKT_RPC_URL not set in env');
        }
        AvalancheMainnetRPCUrls.push(AVALANCHE_MAINNET_POKT_RPC_URL);

        const { AVALANCHE_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof AVALANCHE_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('AVALANCHE_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        AvalancheMainnetRPCUrls.push(AVALANCHE_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(AvalancheMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].QUICK_NODE
          .rpcUrl = AVALANCHE_MAINNET_QUICK_NODE_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].POKT
          .rpcUrl = AVALANCHE_MAINNET_POKT_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = AVALANCHE_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.BASE_MAINNET:
        const BaseMainnetRPCUrls = [];
        const { BASE_MAINNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof BASE_MAINNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('BASE_MAINNET_ALCHEMY_RPC_URL not set in env');
        }
        BaseMainnetRPCUrls.push(BASE_MAINNET_ALCHEMY_RPC_URL);

        const { BASE_MAINNET_INFURA_RPC_URL } = process.env;
        if (typeof BASE_MAINNET_INFURA_RPC_URL !== 'string') {
          throw new Error('BASE_MAINNET_INFURA_RPC_URL not set in env');
        }
        BaseMainnetRPCUrls.push(BASE_MAINNET_INFURA_RPC_URL);

        const { BASE_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof BASE_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('BASE_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        BaseMainnetRPCUrls.push(BASE_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(BaseMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = BASE_MAINNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = BASE_MAINNET_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = BASE_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.BASE_GOERLI_TESTNET:
        const BaseTestnetRPCUrls = [];
        const { BASE_TESTNET_ALCHEMY_RPC_URL } = process.env;
        if (typeof BASE_TESTNET_ALCHEMY_RPC_URL !== 'string') {
          throw new Error('BASE_TESTNET_ALCHEMY_RPC_URL not set in env');
        }
        BaseTestnetRPCUrls.push(BASE_TESTNET_ALCHEMY_RPC_URL);

        const { BASE_TESTNET_INFURA_RPC_URL } = process.env;
        if (typeof BASE_TESTNET_INFURA_RPC_URL !== 'string') {
          throw new Error('BASE_TESTNET_INFURA_RPC_URL not set in env');
        }
        BaseTestnetRPCUrls.push(BASE_TESTNET_INFURA_RPC_URL);

        const { BASE_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof BASE_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('BASE_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        BaseTestnetRPCUrls.push(BASE_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(BaseTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ALCHEMY
          .rpcUrl = BASE_TESTNET_ALCHEMY_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = BASE_TESTNET_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = BASE_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.LINEA_TESTNET:
        const LineaTestnetRPCUrls = [];
        const { LINEA_TESTNET_INFURA_RPC_URL } = process.env;
        if (typeof LINEA_TESTNET_INFURA_RPC_URL !== 'string') {
          throw new Error('LINEA_TESTNET_INFURA_RPC_URL not set in env');
        }
        LineaTestnetRPCUrls.push(LINEA_TESTNET_INFURA_RPC_URL);

        const { LINEA_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof LINEA_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('LINEA_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        LineaTestnetRPCUrls.push(LINEA_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(LineaTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = LINEA_TESTNET_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = LINEA_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.LINEA_MAINNET:
        const LineaMainnetRPCUrls = [];
        const { LINEA_MAINNET_INFURA_RPC_URL } = process.env;
        if (typeof LINEA_MAINNET_INFURA_RPC_URL !== 'string') {
          throw new Error('LINEA_MAINNET_INFURA_RPC_URL not set in env');
        }
        LineaMainnetRPCUrls.push(LINEA_MAINNET_INFURA_RPC_URL);

        const { LINEA_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof LINEA_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('LINEA_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        LineaMainnetRPCUrls.push(LINEA_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(LineaMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].INFURA
          .rpcUrl = LINEA_MAINNET_INFURA_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = LINEA_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.MANTLE_TESTNET:
        const MantleTestnetRPCUrls = [];
        const { MANTLE_TESTNET_ANKR_RPC_URL } = process.env;
        if (typeof MANTLE_TESTNET_ANKR_RPC_URL !== 'string') {
          throw new Error('MANTLE_TESTNET_ANKR_RPC_URL not set in env');
        }
        MantleTestnetRPCUrls.push(MANTLE_TESTNET_ANKR_RPC_URL);

        const { MANTLE_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof MANTLE_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('MANTLE_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        MantleTestnetRPCUrls.push(MANTLE_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(MantleTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ANKR
          .rpcUrl = MANTLE_TESTNET_ANKR_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = MANTLE_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.MANTLE_MAINNET:
        const MantleMainnetRPCUrls = [];
        const { MANTLE_MAINNET_ANKR_RPC_URL } = process.env;
        if (typeof MANTLE_MAINNET_ANKR_RPC_URL !== 'string') {
          throw new Error('MANTLE_MAINNET_ANKR_RPC_URL not set in env');
        }
        MantleMainnetRPCUrls.push(MANTLE_MAINNET_ANKR_RPC_URL);

        const { MANTLE_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof MANTLE_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('MANTLE_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        MantleMainnetRPCUrls.push(MANTLE_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(MantleMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ANKR
          .rpcUrl = MANTLE_MAINNET_ANKR_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = MANTLE_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.OP_BNB_TESTNET:
        const OPBNBTestnetRPCUrls = [];
        const { OP_BNB_TESTNET_NODE_REAL_RPC_URL } = process.env;
        if (typeof OP_BNB_TESTNET_NODE_REAL_RPC_URL !== 'string') {
          throw new Error('OP_BNB_TESTNET_NODE_REAL_RPC_URL not set in env');
        }
        OPBNBTestnetRPCUrls.push(OP_BNB_TESTNET_NODE_REAL_RPC_URL);

        const { OP_BNB_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof OP_BNB_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('OP_BNB_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        OPBNBTestnetRPCUrls.push(OP_BNB_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(OPBNBTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].NODE_REAL
          .rpcUrl = OP_BNB_TESTNET_NODE_REAL_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = OP_BNB_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.OP_BNB_MAINNET:
        const OPBNBMainnetRPCUrls = [];
        const { OP_BNB_MAINNET_NODE_REAL_RPC_URL } = process.env;
        if (typeof OP_BNB_MAINNET_NODE_REAL_RPC_URL !== 'string') {
          throw new Error('OP_BNB_MAINNET_NODE_REAL_RPC_URL not set in env');
        }
        OPBNBMainnetRPCUrls.push(OP_BNB_MAINNET_NODE_REAL_RPC_URL);

        const { OP_BNB_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof OP_BNB_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('OP_BNB_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        OPBNBMainnetRPCUrls.push(OP_BNB_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(OPBNBMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].NODE_REAL
          .rpcUrl = OP_BNB_MAINNET_NODE_REAL_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = OP_BNB_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.ASTAR_TESTNET:
        const AstarTestnetRPCUrls = [];
        const { ASTAR_TESTNET_BLAST_API_RPC_URL } = process.env;
        if (typeof ASTAR_TESTNET_BLAST_API_RPC_URL !== 'string') {
          throw new Error('ASTAR_TESTNET_BLAST_API_RPC_URL not set in env');
        }
        AstarTestnetRPCUrls.push(ASTAR_TESTNET_BLAST_API_RPC_URL);

        const { ASTAR_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof ASTAR_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ASTAR_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        AstarTestnetRPCUrls.push(ASTAR_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(AstarTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].BLAST_API
          .rpcUrl = ASTAR_TESTNET_BLAST_API_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ASTAR_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.ASTAR_MAINNET:
        const AstarMainnetRPCUrls = [];
        const { ASTAR_MAINNET_BLAST_API_RPC_URL } = process.env;
        if (typeof ASTAR_MAINNET_BLAST_API_RPC_URL !== 'string') {
          throw new Error('ASTAR_MAINNET_BLAST_API_RPC_URL not set in env');
        }
        AstarMainnetRPCUrls.push(ASTAR_MAINNET_BLAST_API_RPC_URL);

        const { ASTAR_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof ASTAR_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('ASTAR_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        AstarMainnetRPCUrls.push(ASTAR_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(AstarMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].BLAST_API
          .rpcUrl = ASTAR_MAINNET_BLAST_API_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = ASTAR_MAINNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.CHILLIZ_TESTNET:
        const ChilizTestnetRPCUrls = [];
        const { CHILIZ_TESTNET_ANKR_RPC_URL } = process.env;
        if (typeof CHILIZ_TESTNET_ANKR_RPC_URL !== 'string') {
          throw new Error('CHILIZ_TESTNET_ANKR_RPC_URL not set in env');
        }
        ChilizTestnetRPCUrls.push(CHILIZ_TESTNET_ANKR_RPC_URL);

        const { CHILIZ_TESTNET_PUBLIC_RPC_URL } = process.env;
        if (typeof CHILIZ_TESTNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('CHILIZ_TESTNET_PUBLIC_RPC_URL not set in env');
        }
        ChilizTestnetRPCUrls.push(CHILIZ_TESTNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ChilizTestnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ANKR
          .rpcUrl = CHILIZ_TESTNET_ANKR_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = CHILIZ_TESTNET_PUBLIC_RPC_URL;
        break;
      case BLOCKCHAINS.CHILLIZ_MAINNET:
        const ChilizMainnetRPCUrls = [];
        const { CHILIZ_MAINNET_ANKR_RPC_URL } = process.env;
        if (typeof CHILIZ_MAINNET_ANKR_RPC_URL !== 'string') {
          throw new Error('CHILIZ_MAINNET_ANKR_RPC_URL not set in env');
        }
        ChilizMainnetRPCUrls.push(CHILIZ_MAINNET_ANKR_RPC_URL);

        const { CHILIZ_MAINNET_PUBLIC_RPC_URL } = process.env;
        if (typeof CHILIZ_MAINNET_PUBLIC_RPC_URL !== 'string') {
          throw new Error('CHILIZ_MAINNET_PUBLIC_RPC_URL not set in env');
        }
        ChilizMainnetRPCUrls.push(CHILIZ_MAINNET_PUBLIC_RPC_URL);

        await this.checkIfRPCIsStable(ChilizMainnetRPCUrls, chainId);
        this.config.chains.providerNameWeightAndRPCUrl[chainId].ANKR
          .rpcUrl = CHILIZ_MAINNET_ANKR_RPC_URL;
        this.config.chains.providerNameWeightAndRPCUrl[chainId].PUBLIC_RPC
          .rpcUrl = CHILIZ_MAINNET_PUBLIC_RPC_URL;
        break;
      default:
        break;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async checkIfRPCIsStable(rpcUrls: string[], chainId: number) {
    try {
      const data = {
        methid: 'eth_chainId',
        params: [],
        jsonrpc: '2.0',
        id: 1,
      };

      for (const rpcUrl of rpcUrls) {
        const response = await axios.post(rpcUrl, data);
        const {
          result,
        } = response.data;

        if (!result) {
          throw new Error(`Error in making eth_chainId call on rpcUrl: ${rpcUrl} on chainId: ${chainId}`);
        }
        if (chainId !== Number(result)) {
          throw new Error(`ChainId returned from RPC url does not match: ${chainId}`);
        }
      }
    } catch (error) {
      throw new Error(`Error in checking if RPC is stable, error: ${JSON.stringify(error)}`);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  assertEnv(envVar: string | undefined): void {
    if (typeof envVar !== 'string') {
      throw new Error(`${envVar} not set in env`);
    }
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
