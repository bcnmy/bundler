/* eslint-disable import/no-extraneous-dependencies */
import { ethers } from 'ethers';
import { BiconomySmartAccount } from '@biconomy/account';
import { logger } from '../../log-config';
import { BundlerSimulationAndValidationService } from '../BundlerSimulationAndValidationService';
import { config } from '../../../config';
import { EVMNetworkService } from '../../network';
import { TenderlySimulationService } from '../external-simulation';
import { RedisCacheService } from '../../cache';
import { MumbaiGasPrice } from '../../gas-price/networks/MumbaiGasPrice';
import { UserOperationType } from '../../types';

const log = logger(module);
// mumbai gas estimations
describe('Mumbai 4337 Gas Estimations', () => {
  let bundlerSimulationAndValidationService: BundlerSimulationAndValidationService;
  let entryPointContract: ethers.Contract;
  let biconomySmartAccount: any;
  let eoa: any;

  beforeEach(async () => {
    const networkService = new EVMNetworkService({
      chainId: 80001,
      rpcUrl: config.chains.provider[80001],
      fallbackRpcUrls: [],
    });
    const cacheService = RedisCacheService.getInstance();
    const gasPriceService = new MumbaiGasPrice(
      cacheService,
      networkService,
      {
        chainId: 80001,
        EIP1559SupportedNetworks: [80001],
      },
    );
    const tenderlySimulationService = new TenderlySimulationService(
      gasPriceService,
      cacheService,
      {
        tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
        tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
        tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
      },
    );
    bundlerSimulationAndValidationService = new BundlerSimulationAndValidationService(
      networkService,
      tenderlySimulationService,
    );
    const provider = new ethers.providers.JsonRpcProvider(config.chains.provider[80001]);
    entryPointContract = new ethers.Contract('0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789', config.abi.entryPointAbi, provider);

    // dummy private key generated for test cases
    const privateKey = '3ad70468b6436cdcb10056758ff81bf9cb70b29ba8c6cba8d80b932649136c82';
    const signer = new ethers.Wallet(privateKey, provider);
    eoa = await signer.getAddress();
    log.info(`EOA address: ${eoa}`);

    const biconomySmartAccountConfig = {
      signer,
      chainId: 80001,
      rpcUrl: config.chains.provider[80001],
    };

    const biconomyAccount = new BiconomySmartAccount(biconomySmartAccountConfig);
    biconomySmartAccount = await biconomyAccount.init({ accountIndex: 0 });
  });

  /** callGasLimit success test cases */
  // Biconomy Smart Account native asset transfer
  it('Biconomy Smart Account native asset transfer', async () => {
    const transaction = {
      to: eoa,
      value: ethers.utils.parseEther('0.0001'),
      data: '0x',
    };

    const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

    const response = await bundlerSimulationAndValidationService.estimateUserOperationGas(
      {
        userOp: partialUserOp as UserOperationType,
        chainId: 80001,
        entryPointContract,
      },
    );
    expect(response);
  });

  // Biconomy Smart Account single NFT transfer
  it('Biconomy Smart Account single NFT transfer', async () => {
    const nftInterface = new ethers.utils.Interface([
      'function safeMint(address _to)',
    ]);
    const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
    const data = nftInterface.encodeFunctionData('safeMint', [scwAddress]);

    const nftAddress = '0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e'; // Todo // use from config
    const transaction = {
      to: nftAddress,
      value: '0x',
      data,
    };

    const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

    const response = await bundlerSimulationAndValidationService.estimateUserOperationGas(
      {
        userOp: partialUserOp as UserOperationType,
        chainId: 80001,
        entryPointContract,
      },
    );
    expect(response);
  });

  // Biconomy Smart Account 30 NFT transfers
  it('Biconomy Smart Account 30 NFT transfers', async () => {
    const nftInterface = new ethers.utils.Interface([
      'function safeMint(address _to)',
    ]);
    const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
    const data = nftInterface.encodeFunctionData('safeMint', [scwAddress]);

    const nftAddress = '0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e'; // Todo // use from config
    const transaction = {
      to: nftAddress,
      value: '0x',
      data,
    };

    const transactions = [transaction];
    for (let index = 0; index < 30; index += 1) {
      transactions.push(transaction);
    }

    const partialUserOp = await biconomySmartAccount.buildUserOp(transactions);

    const response = await bundlerSimulationAndValidationService.estimateUserOperationGas(
      {
        userOp: partialUserOp as UserOperationType,
        chainId: 80001,
        entryPointContract,
      },
    );
    expect(response);
  });

  // Biconomy Smart Account 100 NFT transfers
  it('Biconomy Smart Account 100 NFT transfers', async () => {
    const nftInterface = new ethers.utils.Interface([
      'function safeMint(address _to)',
    ]);
    const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
    const data = nftInterface.encodeFunctionData('safeMint', [scwAddress]);

    const nftAddress = '0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e'; // Todo // use from config
    const transaction = {
      to: nftAddress,
      value: '0x',
      data,
    };

    const transactions = [transaction];
    for (let index = 0; index < 99; index += 1) {
      transactions.push(transaction);
    }

    const partialUserOp = await biconomySmartAccount.buildUserOp(transactions);

    const response = await bundlerSimulationAndValidationService.estimateUserOperationGas(
      {
        userOp: partialUserOp as UserOperationType,
        chainId: 80001,
        entryPointContract,
      },
    );
    expect(response);
  });

  /** callGasLimit failure test cases */
  // Biconomy Smart Account native asset transfer
  it('Biconomy Smart Account native asset transfer', async () => {
    const transaction = {
      to: eoa,
      value: ethers.utils.parseEther('10'),
      data: '0x',
    };

    const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

    const response = await bundlerSimulationAndValidationService.estimateUserOperationGas(
      {
        userOp: partialUserOp as UserOperationType,
        chainId: 80001,
        entryPointContract,
      },
    );
    expect(response);
  });

  /** verificationGasLimit failure test cases */
  // failure in validation phase for factory
  // failure in validation phase for account
  // failure in validation phase for payamster

  /** verificationGasLimit success test cases */
  // basic smart account deployment + signature and nonce validation
  // high gas for factory smart account deployment
  // high gas for account validateUserOp
  // high gas for paymaster validatePaymasterUserOp

  /** preVerificationGas test cases */
  // should give 5% profit
  // should give 10% profit
  // should give 50% profit
});
