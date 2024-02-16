
# declare -A chain_mumbai=(
#   [name]='chain-80001'
#   [chainId]="80001"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="2"
#   [fundingRelayerAmount]="5"
#   [minReplica]=1
#   [maxReplica]=20
#   )

# declare -A chain_bnb=(
#   [name]='chain-56'
#   [chainId]="56"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="0.06"
#   [fundingRelayerAmount]="0.15"
#   [minReplica]=6
#   [maxReplica]=6
# )

# declare -A chain_polygon=(
#   [name]='chain-137'
#   [chainId]="137"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="2"
#   [fundingRelayerAmount]="5"
#   [minReplica]=6
#   [maxReplica]=6)


declare -A chain_arbitrum=(
  [name]='chain-42161'
  [chainId]="42161"
  [autoScalingThreshholdHTTPRequestsPerMinute]=1000
  [autoScalingThreshholdCPU]=800m
  [minRelayerCount]="200"
  [maxRelayerCount]="220"
  [fundingBalanceThreshold]="0.01"
  [fundingRelayerAmount]="0.03"
  [minReplica]=3
  [maxReplica]=3
)


# declare -A chain_avalanche=(
#   [name]='chain-43114'
#   [chainId]="43114"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="0.1"
#   [fundingRelayerAmount]="0.25"
#   [minReplica]=3
#   [maxReplica]=3
# )

# declare -A chain_opBNB=(
#   [name]='chain-204'
#   [chainId]="204"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=900m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]=".001"
#   [fundingRelayerAmount]=".0025"
#   [minReplica]=3
#   [maxReplica]=3
# )

# declare -A chain_base=(
#   [name]='chain-8453'
#   [chainId]="8453"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="0.006"
#   [fundingRelayerAmount]="0.015"
#   [minReplica]=3
#   [maxReplica]=3
# )

# declare -A chain_optimism=(
#   [name]='chain-10'
#   [chainId]="10"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=1000
#   [autoScalingThreshholdCPU]=800m
#   [minRelayerCount]="200"
#   [maxRelayerCount]="220"
#   [fundingBalanceThreshold]="0.01"
#   [fundingRelayerAmount]="0.025"
#   [minReplica]=3
#   [maxReplica]=3
# )