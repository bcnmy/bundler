import { IEVMAccount } from "../../relayer/account";
import { ICacheService } from "../cache";
import { INetworkService } from "../network";
import { EVMRawTransactionType } from "../types";
import { IGasPriceManager } from "./interface/IGasPriceManager";
import { BSCTestnetGasPrice } from "./networks/BSCTestnetGasPrice";
import { EthGasPrice } from "./networks/EthGasPrice";
import { MumbaiGasPrice } from "./networks/MumbaiGasPrice";
import { PolygonZKEvmTestnetGasPrice } from "./networks/PolygonZKEvmTestnetGasPrice";
import { BSCMainnetGasPrice } from "./networks/BSCMainnetGasPrice";
import { PolygonZKEvmMainnetGasPrice } from "./networks/PolygonZKEvmMainnetGasPrice";
import { ArbNovaMainnetGasPrice } from "./networks/ArbNovaMainnetGasPrice";
import { OptimismGoerliGasPrice } from "./networks/OptimismGoerliGasPrice";
import { AvalanceTestnetGasPrice } from "./networks/AvalanceTestnetGasPrice";
import { BaseGoerliGasPrice } from "./networks/BaseGoerliGasPrice";
import { BaseMainnetGasPrice } from "./networks/BaseMainnetGasPrice";
import { LineaTestnetGasPrice } from "./networks/LineaTestnetGasPrice";
import { LineaMainnetGasPrice } from "./networks/LineaMainnetGasPrice";
import { OptimismMainnetGasPrice } from "./networks/OptimismMainnetGasPrice";
import { AvalanceMainnetGasPrice } from "./networks/AvalanceMainnetGasPrice";
import { MantleMainnetGasPrice } from "./networks/MantleMainnetGasPrice";
import { MantleTestnetGasPrice } from "./networks/MantleTestnetGasPrice";
import { OpBNBMainnetGasPrice } from "./networks/OpBNBMainnetGasPrice";
import { OpBNBTestnetGasPrice } from "./networks/OpBNBTestnetGasPrice";
import { ChillizMainnetGasPrice } from "./networks/ChillizMainnetGasPrice";
import { AstarMainnetGasPrice } from "./networks/AstarMainnetGasPrice";
import { ChillizTestnetGasPrice } from "./networks/ChillizTestnetGasPrice";
import { AstarTestnetGasPrice } from "./networks/AstarTestnetGasPrice";
import { CoreMainnetGasPrice } from "./networks/CoreMainnetGasPrice";
import { CoreTestnetGasPrice } from "./networks/CoreTestnetGasPrice";
import { MantaMainnetGasPrice } from "./networks/MantaMainnetGasPrice";
import { MantaTestnetGasPrice } from "./networks/MantaTestnetGasPrice";
import { ComboTestnetGasPrice } from "./networks/ComboTestnetGasPrice";
import { ComboMainnetGasPrice } from "./networks/ComboMainnetGasPrice";
import { CapXChainGasPrice } from "./networks/CapXChainGasPrice";
import { ArbitrumSepoliaGasPrice } from "./networks/ArbitrumSepoliaGasPrice";
import { SepoliaGasPrice } from "./networks/SepoliaGasPrice";
import { PolygonGasPrice } from "./networks/PolygonGasPrice";
import { ArbitrumOneMainnetGasPrice } from "./networks/ArbitrumOneMainnetGasPrice";

export type GasPriceServiceType =
  | PolygonGasPrice
  | MumbaiGasPrice
  | EthGasPrice
  | BSCTestnetGasPrice
  | BSCMainnetGasPrice
  | PolygonZKEvmTestnetGasPrice
  | PolygonZKEvmMainnetGasPrice
  | ArbitrumOneMainnetGasPrice
  | ArbNovaMainnetGasPrice
  | OptimismGoerliGasPrice
  | OptimismMainnetGasPrice
  | AvalanceTestnetGasPrice
  | AvalanceMainnetGasPrice
  | BaseGoerliGasPrice
  | BaseMainnetGasPrice
  | LineaTestnetGasPrice
  | LineaMainnetGasPrice
  | undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceServiceType> {
  cacheService: ICacheService;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  options: {
    chainId: number;
    EIP1559SupportedNetworks: Array<number>;
  };

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number;
      EIP1559SupportedNetworks: Array<number>;
    },
  ) {
    this.networkService = networkService;
    this.cacheService = cacheService;
    this.options = options;
  }

  setup() {
    switch (this.options.chainId) {
      case 1:
        return new EthGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 137:
        return new PolygonGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 10,
        });
      case 80001:
        return new MumbaiGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 97:
        return new BSCTestnetGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 56:
        return new BSCMainnetGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 1442:
        return new PolygonZKEvmTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 1101:
        return new PolygonZKEvmMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 42161:
        return new ArbitrumOneMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 42170:
        return new ArbNovaMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 420:
        return new OptimismGoerliGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 10:
        return new OptimismMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 43113:
        return new AvalanceTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 43114:
        return new AvalanceMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 30,
          },
        );
      case 84531:
        return new BaseGoerliGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 8453:
        return new BaseMainnetGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 59140:
        return new LineaTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 59144:
        return new LineaMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 204:
        return new OpBNBMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 5611:
        return new OpBNBTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 5000:
        return new MantleMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 5001:
        return new MantleTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 88888:
        return new ChillizMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 592:
        return new AstarMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 88882:
        return new ChillizTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 81:
        return new AstarTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 169:
        return new MantaMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 3441005:
        return new MantaTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 1116:
        return new CoreMainnetGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 1115:
        return new CoreTestnetGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 91715:
        return new ComboTestnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 9980:
        return new ComboMainnetGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 7116:
        return new CapXChainGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      case 421614:
        return new ArbitrumSepoliaGasPrice(
          this.cacheService,
          this.networkService,
          {
            ...this.options,
            updateFrequencyInSeconds: 60,
          },
        );
      case 11155111:
        return new SepoliaGasPrice(this.cacheService, this.networkService, {
          ...this.options,
          updateFrequencyInSeconds: 60,
        });
      default:
        return undefined;
    }
  }
}
