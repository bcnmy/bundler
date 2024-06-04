
#
Let’s assume you have two pods with names "statefulset-pod-1" and "statefulset-pod-2".

If "statefulset-pod-1" has received 10 requests in the last 5 minutes, and "statefulset-pod-2" 
has received 20 requests in the last 5 minutes, then the rate function will calculate the per-second 
average rate for these two pods separately.

After that, the sum by(pod) part will sum up these rates separately for each "pod" label, so you will
 get separate sum results for "statefulset-pod-1" and "statefulset-pod-2".

```
sum by(pod) (rate(http_request_duration_seconds_bucket{pod=~".*statefulset.*"}[2m]))
```

# cpu
```
sum by(pod) (rate(container_cpu_usage_seconds_total{pod=~".*statefulset.*"}[2m]))
```

# http requests per pod

```
sum(rate(http_requests_total{pod=~".*statefulset.*"}[2m])) by (pod)
```

## average http requests over all pods
 http_requests_per_two_minute metric goes beyond 100, then you should set the averageValue for that metric to 100 (or 100000m, as 1 = 1000m).
```
avg(rate(http_requests_total{pod=~".*statefulset.*"}[2m]))

```