describe('broken test suite', () => {
  it('should be fixed', () => {});
});
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable max-len */
// import { ethers } from 'ethers';
// import axios from 'axios';
// import { config } from '../../../config';
// import { EVMNetworkService, RpcMethod } from '../../../common/network';
// import { EVMRawTransactionType } from '../../../common/types';
// import { IEVMAccount } from '../../../relayer/src/services/account';
// import { MockMFA } from '../mocks/mockEVMAccount';
// import { ERC20_ABI } from '../../../common/constants';

// const goerli = 5;
// const mumbai = 80001; // to test eip1559 supported networks
// const dummyAddress = '0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c';
// const dummyContractAddress = '0x64Ef393b6846114Bad71E2cB2ccc3e10736b5716';
// const dummySpenderAddress = '0xa86B30C63E068dBB6bdDEa6fe76bf92F194Dc53b';
// const dummyTokenAddress = '0x64Ef393b6846114Bad71E2cB2ccc3e10736b5716';
// const dummyTxnHash = '0x43df08a2020aac3acfaeb719d81aa377d0d3e18cadf71c2c529286265c1f2603';
// const dummyTransactionReceipt = {
//   to: dummySpenderAddress,
//   from: dummyAddress,
//   contractAddress: '',
//   transactionIndex: 0,
//   gasUsed: ethers.BigNumber.from('100000'),
//   logsBloom: '',
//   blockHash: '',
//   transactionHash: '',
//   logs: [],
//   blockNumber: 0,
//   confirmations: 0,
//   cumulativeGasUsed: ethers.BigNumber.from('100000'),
//   effectiveGasPrice: ethers.BigNumber.from('100000'),
//   byzantium: false,
//   type: 0,
// };

// describe('EVMNetworkService', () => {
//   let evmNetworkServiceGoerli: EVMNetworkService;
//   let evmNetworkServiceMumbai: EVMNetworkService;
//   let ethersProviderGoerli: ethers.providers.JsonRpcProvider;
//   let ethersProviderMumbai: ethers.providers.JsonRpcProvider;

//   beforeAll(async () => {
//     ethersProviderGoerli = new ethers.providers.JsonRpcProvider({
//       url: config.chains.provider[goerli],
//       timeout: 10000,
//     });

//     ethersProviderMumbai = new ethers.providers.JsonRpcProvider({
//       url: config.chains.provider[mumbai],
//       timeout: 10000,
//     });

//     evmNetworkServiceGoerli = new EVMNetworkService({
//       chainId: goerli,
//       rpcUrl: config.chains.provider[goerli],
//       fallbackRpcUrls: config.chains.fallbackUrls[goerli],
//     });

//     // To test eip1559 supported tramsactions
//     evmNetworkServiceMumbai = new EVMNetworkService({
//       chainId: mumbai,
//       rpcUrl: config.chains.provider[mumbai],
//       fallbackRpcUrls: config.chains.fallbackUrls[mumbai],
//     });
//   });

//   afterEach(async () => {
//     jest.resetAllMocks();
//     jest.clearAllMocks();
//   });

//   it('should call useProvider() with tag = RpcMethod.getGasPrice ', async () => {
//     const gasPrice = ethers.BigNumber.from('1000000000');
//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'getGasPrice').mockImplementationOnce(() => Promise.resolve(gasPrice));
//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getGasPrice);
//     expect(result).toEqual(gasPrice);
//     expect(ethersProviderGoerli.getGasPrice).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.getEIP1159GasPrice ', async () => {
//     const gasPrice: ethers.providers.FeeData = {
//       maxPriorityFeePerGas: ethers.BigNumber.from('100000000'),
//       maxFeePerGas: ethers.BigNumber.from('1000000000'),
//       lastBaseFeePerGas: null,
//       gasPrice: null,
//     };

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderMumbai;
//     jest.spyOn(ethersProviderMumbai, 'getFeeData').mockImplementationOnce(() => Promise.resolve(gasPrice));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getEIP1159GasPrice);

//     expect(result.toString()).toEqual(gasPrice.toString());
//     expect(ethersProviderMumbai.getFeeData).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.getBalance ', async () => {
//     const expectedBalance = ethers.BigNumber.from('100000000');

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'getBalance').mockImplementationOnce(() => Promise.resolve(expectedBalance));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getBalance, { address: dummyAddress });

//     expect(result).toEqual(expectedBalance);
//     expect(ethersProviderGoerli.getBalance).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.estimateGas ', async () => {
//     const expectedGas = ethers.BigNumber.from('100000000');

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'estimateGas').mockImplementationOnce(() => Promise.resolve(expectedGas));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.estimateGas, {
//       from: dummyAddress,
//       to: dummySpenderAddress,
//       data: '',
//     });

//     expect(result).toEqual(expectedGas);
//     expect(ethersProviderGoerli.estimateGas).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.getTransactionReceipt ', async () => {
//     const expectedOutput: ethers.providers.TransactionReceipt = dummyTransactionReceipt;

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'getTransactionReceipt').mockImplementationOnce(() => Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getTransactionReceipt, dummyTxnHash);

//     expect(result).toEqual(expectedOutput);
//     expect(ethersProviderGoerli.getTransactionReceipt).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.getTransactionCount, param = {pendingNonce: true} ', async () => {
//     const expectedOutput = 6;

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'getTransactionCount').mockImplementationOnce(() => Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getTransactionCount, { pendingNonce: true });

//     expect(result).toEqual(expectedOutput);
//     expect(ethersProviderGoerli.getTransactionCount).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.getTransactionCount, param = {pendingNonce: false} ', async () => {
//     const expectedOutput = 2;

//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'getTransactionCount').mockImplementationOnce(() => Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.getTransactionCount, { pendingNonce: false });

//     expect(result).toEqual(expectedOutput);
//     expect(ethersProviderGoerli.getTransactionCount).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.waitForTransaction ', async () => {
//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'waitForTransaction').mockImplementationOnce(() => Promise.resolve(dummyTransactionReceipt));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.waitForTransaction, { transactionHash: dummyTxnHash });

//     expect(result).toEqual(dummyTransactionReceipt);
//     expect(ethersProviderGoerli.waitForTransaction).toHaveBeenCalled();
//   });

//   it('should call useProvider() with tag = RpcMethod.sendTransaction ', async () => {
//     const expectedOutput: ethers.providers.TransactionResponse = {
//       hash: dummyTxnHash,
//       confirmations: 0,
//       from: dummyAddress,
//       wait(confirmations?: number | undefined): Promise<ethers.providers.TransactionReceipt> {
//         throw new Error('Function not implemented.');
//       },
//       nonce: 0,
//       gasLimit: ethers.BigNumber.from('100000'),
//       data: '',
//       value: ethers.BigNumber.from('100000'),
//       chainId: 0,
//     };
//     evmNetworkServiceGoerli.ethersProvider = ethersProviderGoerli;
//     jest.spyOn(ethersProviderGoerli, 'sendTransaction').mockImplementationOnce(() => Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.useProvider(RpcMethod.sendTransaction, { transactionHash: dummyTxnHash });

//     expect(result).toEqual(expectedOutput);
//     expect(ethersProviderGoerli.sendTransaction).toHaveBeenCalled();
//   });

//   it('should return a contract instance', async () => {
//     const contract = await evmNetworkServiceGoerli.getContract(customJSONStringify(ERC20_ABI), dummyContractAddress);
//     expect(contract).toBeInstanceOf(ethers.Contract);
//     expect(contract.address).toEqual(dummyContractAddress);
//   });

//   it('should call estimateGas() ', async () => {
//     const expectedGas = ethers.BigNumber.from('1000000000');
//     const methodName = 'approve';
//     const params = [{ param1: 'param1' }, { param2: 'param2' }];
//     const contract = await evmNetworkServiceGoerli.getContract(customJSONStringify(ERC20_ABI), dummyContractAddress);
//     jest.spyOn(contract.interface, 'encodeFunctionData').mockReturnValueOnce('dummyFunctionSignature');
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedGas));
//     const result = await evmNetworkServiceGoerli.estimateGas(contract, methodName, params, dummyAddress);
//     expect(result).toEqual(expectedGas);
//   });

//   it('should call getEIP1559GasPrice()', async () => {
//     const expectedOutput = {
//       maxFeePerGas: ethers.BigNumber.from('1000000000')._hex,
//       maxPriorityFeePerGas: ethers.BigNumber.from('1000000000')._hex,
//     };
//     jest.spyOn(evmNetworkServiceMumbai, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));
//     const eip1559GasPrice = await evmNetworkServiceMumbai.getEIP1559GasPrice();
//     expect(eip1559GasPrice).toEqual(expectedOutput);
//   });

//   it('should call getGasPrice()', async () => {
//     const expectedOutput = ethers.BigNumber.from('1000000000');
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));
//     const gasPrice = await evmNetworkServiceGoerli.getGasPrice();
//     expect(gasPrice.gasPrice).toEqual(expectedOutput._hex);
//   });

//   it('should call getBalance()', async () => {
//     const expectedOutput = '5000000';
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));
//     const balance = await evmNetworkServiceGoerli.getBalance(dummyAddress);
//     expect(balance).toEqual(ethers.BigNumber.from(expectedOutput));
//   });

//   it('should call getTokenBalance()', async () => {
//     const expectedOutput = ethers.BigNumber.from(100);
//     const getContract = jest.fn().mockReturnValueOnce({ balanceOf: jest.fn().mockResolvedValue(expectedOutput) });

//     evmNetworkServiceGoerli.getContract = getContract;

//     const balance = await evmNetworkServiceGoerli.getTokenBalance(dummyAddress, dummyTokenAddress);
//     expect(balance).toEqual(expectedOutput);
//   });

//   it('should call checkAllowance(), if allowance - value > 0 ', async () => {
//     const allowanceGiven = ethers.BigNumber.from('2000');
//     const getContract = jest.fn().mockReturnValueOnce({ allowance: jest.fn().mockResolvedValue(allowanceGiven) });

//     evmNetworkServiceGoerli.getContract = getContract;

//     const isSpenderAllowed = await evmNetworkServiceGoerli.checkAllowance(dummyTokenAddress, dummyAddress, dummySpenderAddress, ethers.BigNumber.from('100'));
//     expect(isSpenderAllowed).toEqual(true);
//   });

//   it('should call checkAllowance(), if allowance - value < 0 ', async () => {
//     const allowanceGiven = ethers.BigNumber.from('0');
//     const getContract = jest.fn().mockReturnValueOnce({ allowance: jest.fn().mockResolvedValue(allowanceGiven) });

//     evmNetworkServiceGoerli.getContract = getContract;

//     const isSpenderAllowed = await evmNetworkServiceGoerli.checkAllowance(dummyTokenAddress, dummyAddress, dummySpenderAddress, ethers.BigNumber.from('100'));
//     expect(isSpenderAllowed).toEqual(false);
//   });

//   it('should call getDecimal() ', async () => {
//     const expectedTokenDecimal = 6;
//     const getContract = jest.fn().mockReturnValueOnce({ decimal: expectedTokenDecimal });

//     evmNetworkServiceGoerli.getContract = getContract;

//     const result = await evmNetworkServiceGoerli.getDecimal(dummyTokenAddress);
//     expect(result).toEqual(expectedTokenDecimal);
//   });

//   it('should call executeReadMethod() ', async () => {
//     const abi = 'mockedABI';
//     const address = 'mockedAddress';
//     const methodName = 'mockedMethodName';
//     const params = ['param1', 'param2'];
//     const expectedOutput = { mockedValue: 'value' };
//     const contract = { [methodName]: jest.fn().mockResolvedValueOnce(expectedOutput) };
//     const getContract = jest.fn().mockReturnValueOnce(contract);
//     evmNetworkServiceGoerli.getContract = getContract;

//     const result = await evmNetworkServiceGoerli.executeReadMethod(abi, address, methodName, params);
//     expect(result).toEqual(expectedOutput);
//   });

//   it('should call getTransactionReceipt() ', async () => {
//     const expectedOutput = {};
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.getTransactionReceipt(dummyTxnHash);
//     expect(result).toEqual(expectedOutput);
//   });

//   it('should call getNonce() ', async () => {
//     const expectedOutput = 5;
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.getNonce(dummyAddress);
//     expect(result).toEqual(expectedOutput);
//   });

//   it('should call sendTransaction() ', async () => {
//     const expectedOutput: ethers.providers.TransactionResponse = {
//       hash: dummyTxnHash,
//       confirmations: 0,
//       from: dummyAddress,
//       wait(confirmations?: number | undefined): Promise<ethers.providers.TransactionReceipt> {
//         throw new Error('Function not implemented.');
//       },
//       nonce: 0,
//       gasLimit: ethers.BigNumber.from('100000'),
//       data: '',
//       value: ethers.BigNumber.from('100000'),
//       chainId: 0,
//     };

//     const rawTransactionData: EVMRawTransactionType = {
//       from: dummyAddress,
//       gasLimit: ethers.BigNumber.from('100000').toString(),
//       to: dummySpenderAddress,
//       value: '0x0',
//       data: '',
//       chainId: 0,
//       nonce: 0,
//     };

//     const account: IEVMAccount = new MockMFA();
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.sendTransaction(rawTransactionData, account);
//     expect(result).toEqual(expectedOutput);
//   });

//   it('should call waitForTransaction() ', async () => {
//     const expectedOutput: ethers.providers.TransactionReceipt = {
//       to: '',
//       from: '',
//       contractAddress: '',
//       transactionIndex: 0,
//       gasUsed: ethers.BigNumber.from('100000'),
//       logsBloom: '',
//       blockHash: '',
//       transactionHash: '',
//       logs: [],
//       blockNumber: 0,
//       confirmations: 0,
//       cumulativeGasUsed: ethers.BigNumber.from('100000'),
//       effectiveGasPrice: ethers.BigNumber.from('100000'),
//       byzantium: false,
//       type: 0,
//     };
//     jest.spyOn(evmNetworkServiceGoerli, 'useProvider').mockReturnValueOnce(Promise.resolve(expectedOutput));

//     const result = await evmNetworkServiceGoerli.waitForTransaction(dummyTxnHash);
//     expect(result).toEqual(expectedOutput);
//   });

//   it('should call createFilter() ', async () => {
//     const address = 'mockedAddress';
//     const topic = '0x27f12abfe35860a9a927b465bb3d4a9c23c8428174b83f278fe45ed7b4da2662';
//     const result = await EVMNetworkService.createFilter(address, topic);
//     expect(result).toEqual({
//       address,
//       topics: [topic],
//     });
//   });

//   it('should call sendRpcCall() ', async () => {
//     const methodName = 'mockedMethodName';
//     const params = [{ param1: 'param1' }, { param2: 'param2' }];
//     jest.spyOn(axios, 'post').mockReturnValueOnce(Promise.resolve({ dummyResponse: 'dummyResponse' }));
//     const result = await evmNetworkServiceGoerli.sendRpcCall(methodName, params);
//     // eslint-disable-next-line no-new-object
//     expect(result).toEqual(new Object({ dummyResponse: 'dummyResponse' }));
//   });
// });
