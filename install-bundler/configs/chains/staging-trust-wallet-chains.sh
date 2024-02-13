
declare -A chain_mumbai=(
  [name]='chain-80001'
  [chainId]="80001"
  [autoScalingThreshholdHTTPRequestsPerMinute]=10000
  [autoScalingThreshholdCPU]=2500m
  [minRelayerCount]="200"
  [maxRelayerCount]="220"
  [fundingBalanceThreshold]="1"
  [fundingRelayerAmount]="2"
  [minReplica]=2
  [maxReplica]=2
  [isTWSetup]="true"
)