import { ethers } from 'ethers';
import { EVMNetworkService } from '../../../common/network';
import { AASimulationService, SCWSimulationService } from '../../../common/simulation';
import { TenderlySimulationService } from '../../../common/simulation/external-simulation';
import { config } from '../../../config';
import { MockGasPrice } from '../mocks/mockGasPrice';

const goerli = 5;
const toAddress = "0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c";
const refundAddress = "0xa86B30C63E068dBB6bdDEa6fe76bf92F194Dc53b";

describe('SCWSimulationService', () => {
    let scwSimulationService: SCWSimulationService;
    let evmNetworkServiceGoerli: EVMNetworkService;
    let ethersProviderGoerli: ethers.providers.JsonRpcProvider;
    let tenderlySimulationService: any;

    beforeAll(async () => {
        const gasPriceService = new MockGasPrice()

        tenderlySimulationService = new TenderlySimulationService(gasPriceService, {
            tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
            tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
            tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
        });

        ethersProviderGoerli = new ethers.providers.JsonRpcProvider({
            url: config.chains.provider[goerli],
            timeout: 10000,
        });

        evmNetworkServiceGoerli = new EVMNetworkService({
            chainId: goerli,
            rpcUrl: config.chains.provider[goerli],
            fallbackRpcUrls: config.chains.fallbackUrls[goerli],
        });

        // Create a mock instance of the class that contains the postMessage method
        scwSimulationService = new SCWSimulationService(
            evmNetworkServiceGoerli,
            tenderlySimulationService,
        );
    });

    afterEach(async () => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it('should call simulate()', async () => {
        let expectedOutput = {
            isSimulationSuccessful: true,
            gasLimitFromSimulation: 1,
            msgFromSimulation: "string",
        };

        jest.spyOn(scwSimulationService.tenderlySimulationService, "simulate").mockReturnValueOnce(Promise.resolve(expectedOutput));

        let result = await scwSimulationService.simulate({
            chainId: 1,
            data: "",
            to: toAddress,
            refundInfo: refundAddress,
        })

        expect(result).toEqual(expectedOutput);
    });
});

describe('AASimulationService', () => {
    let aaSimulationService: AASimulationService;
    let evmNetworkServiceGoerli: EVMNetworkService;
    let ethersProviderGoerli: ethers.providers.JsonRpcProvider;
    let tenderlySimulationService: any;

    beforeAll(async () => {
        const gasPriceService = new MockGasPrice()

        tenderlySimulationService = new TenderlySimulationService(gasPriceService, {
            tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
            tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
            tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
        });

        ethersProviderGoerli = new ethers.providers.JsonRpcProvider({
            url: config.chains.provider[goerli],
            timeout: 10000,
        });

        evmNetworkServiceGoerli = new EVMNetworkService({
            chainId: goerli,
            rpcUrl: config.chains.provider[goerli],
            fallbackRpcUrls: config.chains.fallbackUrls[goerli],
        });

        // Create a mock instance of the class that contains the postMessage method
        aaSimulationService = new AASimulationService(
            evmNetworkServiceGoerli,
        );
    });

    afterEach(async () => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it('should call parseUserOpSimulationResult(), with paymaster address = 0x0', async () => {

        try {
            AASimulationService.parseUserOpSimulationResult({
                sender: toAddress,
                nonce: '1',
                initCode: '0',
                callData: '',
                callGasLimit: '',
                verificationGasLimit: '',
                preVerificationGas: '',
                maxFeePerGas: '',
                maxPriorityFeePerGas: '',
                paymasterAndData: '',
                signature: '',
            }, {
                errorName: "",
                errorArgs: "0x0000000000000000000000000000000000000000"
            })
        } catch (error: any) {
            expect(error.toString()).toContain("Error: account validation failed");
        }
    });

    it('should call parseUserOpSimulationResult(), with paymaster != 0x0', async () => {
        try {
            AASimulationService.parseUserOpSimulationResult({
                sender: toAddress,
                nonce: '1',
                initCode: '0',
                callData: '',
                callGasLimit: '',
                verificationGasLimit: '',
                preVerificationGas: '',
                maxFeePerGas: '',
                maxPriorityFeePerGas: '',
                paymasterAndData: '',
                signature: '',
            }, {
                errorName: "",
                errorArgs: {
                    paymaster:
                        "0x1100000000000000000000000000000000000000"
                }
            })
        } catch (error: any) {
            expect(error.toString()).toContain("Error: paymaster validation failed");
        }
    });

});