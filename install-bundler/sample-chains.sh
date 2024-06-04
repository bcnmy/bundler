
declare -A chain_avalanche=(
  [name]='chain-43113'
  [chainId]="43113"
  [autoScalingThreshholdHTTPRequests]=15
  [autoScalingThreshholdCPU]=500m
  [minRelayerCount]="3"
  [maxRelayerCount]="5"
  [fundingBalanceThreshold]="0.1"
  [fundingRelayerAmount]="0.2"
  [replica]=1
)

declare -A chain_mumbai=(
  [name]='chain-80001'
  [chainId]="80001"
  [autoScalingThreshholdHTTPRequests]=10
  [autoScalingThreshholdCPU]=500m
  [minRelayerCount]="3"
  [maxRelayerCount]="5"
  [fundingBalanceThreshold]="0.1"
  [fundingRelayerAmount]="0.2"
  [replica]=1

)


declare -A chain_polygon=(
  [name]='chain-137'
  [chainId]="137"
  [autoScalingThreshholdHTTPRequests]=15
  [autoScalingThreshholdCPU]=700m
  [minRelayerCount]="5"
  [maxRelayerCount]="12"
  [fundingBalanceThreshold]="0.1"
  [fundingRelayerAmount]="0.3"
  [replica]=1
)
