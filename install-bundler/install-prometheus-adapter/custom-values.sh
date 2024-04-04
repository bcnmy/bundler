#!/usr/bin/env zsh

# Define chains and replicas

CHAINS=("$@")
# declare -A chains
# chains=( ["chain-43113"]="3" ["chain-80001"]="2" )
# Start the rules section of the YAML
echo "rules:"
echo "  custom:"

# Loop through each chain and generate the rules
for chainId in "${CHAINS[@]}"; do
    replicas=$chains[$chain]

    # Rule for process_cpu_seconds_total
    cat <<-EOF
      - seriesQuery: '{__name__=~"process_cpu_seconds_total",app="chain-${chainId}"}'
        resources:
          template: <<.Resource>>
        name:
          matches: "^(.*)_total"
          as: "${chainId}-cpu-usage"
        metricsQuery: 'avg(rate(<<.Series>>{<<.LabelMatchers>>}[30s])) by (<<.GroupBy>>)'
EOF

    # Rule for http_requests_total
    cat <<-EOF
      - seriesQuery: '{__name__=~"eth_sendUserOperation_requests", code="200", rpc_method="eth_sendUserOperation", app="chain-${chainId}"}'
        resources:
          template: <<.Resource>>
        name:
          matches: "^(.*)_requests"   # Assumes the metric in Prometheus is 'eth_sendUserOperation_requests'
          as: "${chainId}-http-requests"
        metricsQuery: 'avg(rate(<<.Series>>{<<.LabelMatchers>>}[30s])) by (<<.GroupBy>>)'
EOF
done