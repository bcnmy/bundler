
# Progression of logs

## Phase 1: When a useOps is submitted, this is the log entry you will see in the the console.
```
{
  "insertId": "wipvkdza8k5odu2i",
  "jsonPayload": {
    "level": "info",
    "message": "userOp received: {\"sender\":\"0xf275fa2560ceb8badc313a2a29fb166f7ca5de5e\",\"nonce\":\"0x0e\",\"initCode\":\"0x\",\"callData\":\"0x912ccaa3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000020000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000\",\"maxFeePerGas\":\"0x861c4698\",\"maxPriorityFeePerGas\":\"0x59682f10\",\"verificationGasLimit\":\"0xead4\",\"callGasLimit\":\"0x01b5f7\",\"preVerificationGas\":\"0x0122a4\",\"paymasterAndData\":\"0x000031dd6d9d3a133e663660b959162870d755d4000000000000000000000000d39222801871b185ca8db59a62153ee6f07c038800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041c3f1dc30d135ec799c9a691883d1e3cbb5db41dc7ff55ee6c935ac395a6d12e21d2b04c296e1deeda3d6ca728a5b48c6206e5955ae5e16c04afb25526ab496841b00000000000000000000000000000000000000000000000000000000000000\",\"signature\":\"0x661c06494b1d0d0844130b59db399b763b5d9df0a36cbe80a38b41d4dbbe27b7016821f14349e96307533a72a95550dd83909853e3b9a6bfa8a274849b8423451b\"} on chainId: 80001",
    "path": "dist/common/simulation/BundlerSimulationService.js",
    "hostname": "bundlers-statefulset-1",
    "request-id": "3e063180-61cc-11ee-b6a7-ab6d82b174d2",
    "timestamp": "2023-10-03 09:07:13 690"
  },
  "resource": {
    "type": "k8s_container",
    "labels": {
      "location": "us-east1-b",
      "container_name": "bundlers-pod",
      "namespace_name": "qabundler",
      "project_id": "biconomy-test-397415",
      "pod_name": "bundlers-statefulset-1",
      "cluster_name": "with-gcplb"
    }
  },
  "timestamp": "2023-10-03T09:07:13.690197056Z",
  "severity": "INFO",
  "labels": {
    "k8s-pod/app_kubernetes_io/name": "bundlers",
    "compute.googleapis.com/resource_name": "gke-with-gcplb-default-pool-71afda7e-fbdt",
    "k8s-pod/app": "bundlers",
    "k8s-pod/statefulset_kubernetes_io/pod-name": "bundlers-statefulset-1",
    "k8s-pod/namespace": "qabundler",
    "k8s-pod/controller-revision-hash": "bundlers-statefulset-566644c5b4",
    "k8s-pod/app_kubernetes_io/instance": "qabundler-test-bundler"
  },
  "logName": "projects/biconomy-test-397415/logs/stdout",
  "receiveTimestamp": "2023-10-03T09:07:15.612152409Z"
}
```

#### Python code to get UserOps submitted with the timestamp and nonce

```
def userop_submitted_noce(data):
  userop_nonces = []
  for e in data:
    if e.get("jsonPayload") and e["jsonPayload"].get("message"):
      if "userOp received" in e["jsonPayload"]["message"]:
        content =  e["jsonPayload"]["message"]
        match = re.search(r'"nonce":"(.*?)"', content)
        nonce = match.group(1) if match else None
        userop_nonces.append({
            "timestamp": e["jsonPayload"]["timestamp"], 
            "pod_name":e["resource"]["labels"]["pod_name"], 
            "nonce": nonce,
            "message": "UserOp received"})
  return userop_nonces
```

```
 userop_nonces = userop_submitted_noce(data)
```


## Phase 2: When active relayer is selected to submit the tx
```
{
  "insertId": "vd548aq0m3y9a94e",
  "jsonPayload": {
    "path": "src/services/consumer/BundlerConsumer.js",
    "message": "Setting active relayer: 0x75c033055cd4f144d51b59b35dae02d91be03e74 as beneficiary for userOp: {\"sender\":\"0x23da80269487c6033827360fac4e283dbb150e58\",\"nonce\":\"0x0a\",\"initCode\":\"0x\",\"callData\":\"0x912ccaa3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000020000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000\",\"maxFeePerGas\":\"0x861c4698\",\"maxPriorityFeePerGas\":\"0x59682f10\",\"verificationGasLimit\":\"0xead4\",\"callGasLimit\":\"0x01b5f7\",\"preVerificationGas\":\"0x0122a4\",\"paymasterAndData\":\"0x000031dd6d9d3a133e663660b959162870d755d4000000000000000000000000d39222801871b185ca8db59a62153ee6f07c038800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041c9d8457ec4e8ff42e5881686170def54e01c9bc67a75b69ee1dd394f467669884ff438a03790d30ec184184129f71873d9c59ee63c770d26689319b53d4d7fd11c00000000000000000000000000000000000000000000000000000000000000\",\"signature\":\"0x2ef30e3df238b635742e27e3da89f987005907f1babd6f80cb21437646513c0557b4df6b234b3fce62cf84dc5cb001ce55de3460db78822e98395dd8fef3caa91c\"} for transactionId: 0x18a9c030ba977a4e3360be492b1867e34728397a1ef121cf686844288150cfb4 on chainId: 80001",
    "hostname": "bundlers-statefulset-1",
    "level": "info",
    "timestamp": "2023-10-03 09:07:13 509"
  },
  "resource": {
    "type": "k8s_container",
    "labels": {
      "location": "us-east1-b",
      "container_name": "bundlers-pod",
      "cluster_name": "with-gcplb",
      "pod_name": "bundlers-statefulset-1",
      "project_id": "biconomy-test-397415",
      "namespace_name": "qabundler"
    }
  },
  "timestamp": "2023-10-03T09:07:13.509152500Z",
  "severity": "INFO",
  "labels": {
    "k8s-pod/namespace": "qabundler",
    "k8s-pod/controller-revision-hash": "bundlers-statefulset-566644c5b4",
    "compute.googleapis.com/resource_name": "gke-with-gcplb-default-pool-71afda7e-fbdt",
    "k8s-pod/app_kubernetes_io/instance": "qabundler-test-bundler",
    "k8s-pod/statefulset_kubernetes_io/pod-name": "bundlers-statefulset-1",
    "k8s-pod/app_kubernetes_io/name": "bundlers",
    "k8s-pod/app": "bundlers"
  },
  "logName": "projects/biconomy-test-397415/logs/stdout",
  "receiveTimestamp": "2023-10-03T09:07:15.612152409Z"
}
```
#### python code 
```

def nonce_to_txids(data):
  array = []
  txid_nonce = {}
  for e in data:
    if e.get("jsonPayload") and e["jsonPayload"].get("message"):
      if "Setting active relayer" in e["jsonPayload"]["message"]:
        s =  e["jsonPayload"]["message"]
        active_relayer_match = re.search(r'Setting active relayer: (\w+)', s)
        activeRelayer = active_relayer_match.group(1) if active_relayer_match else None
        transaction_id_match = re.search(r'transactionId: (\w+)', s)
        transactionId = transaction_id_match.group(1) if transaction_id_match else None
        # Extract nonce from the JSON
        nonce_match = re.search(r'"nonce":"(\w+)"', s)
        nonce = nonce_match.group(1) if nonce_match else None
        array.append({
          "timestamp": e["jsonPayload"]["timestamp"], 
          "nonce": nonce, 
          "transactionId": transactionId, 
          "pod_name":  e["resource"]["labels"]["pod_name"], 
          "relayer": activeRelayer,
          "message": "Active relayer assigned"})
        txid_nonce[transactionId] = nonce
  return array, txid_nonce

```

```
nonceTxIds, txid_nonce = nonce_to_txids(data)
```


## 3rd phase: Submitted to the blockchain

```
{
  "insertId": "sz6qqeiwmg490c1r",
  "jsonPayload": {
    "level": "info",
    "timestamp": "2023-10-03 09:07:13 529",
    "hostname": "bundlers-statefulset-1",
    "message": "Sending transaction to network: {\"from\":\"0x75c033055cd4f144d51b59b35dae02d91be03e74\",\"to\":\"0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789\",\"value\":\"0x0\",\"gasLimit\":\"0x22a6ae\",\"data\":\"0x1fad948c000000000000000000000000000000000000000000000000000000000000004000000000000000000000000075c033055cd4f144d51b59b35dae02d91be03e740000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000023da80269487c6033827360fac4e283dbb150e58000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000001b5f7000000000000000000000000000000000000000000000000000000000000ead400000000000000000000000000000000000000000000000000000000000122a400000000000000000000000000000000000000000000000000000000861c46980000000000000000000000000000000000000000000000000000000059682f100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000244912ccaa3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000020000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e497953000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d4000031dd6d9d3a133e663660b959162870d755d4000000000000000000000000d39222801871b185ca8db59a62153ee6f07c038800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041c9d8457ec4e8ff42e5881686170def54e01c9bc67a75b69ee1dd394f467669884ff438a03790d30ec184184129f71873d9c59ee63c770d26689319b53d4d7fd11c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412ef30e3df238b635742e27e3da89f987005907f1babd6f80cb21437646513c0557b4df6b234b3fce62cf84dc5cb001ce55de3460db78822e98395dd8fef3caa91c00000000000000000000000000000000000000000000000000000000000000\",\"chainId\":80001,\"nonce\":16,\"type\":2,\"maxFeePerGas\":\"0x861c4698\",\"maxPriorityFeePerGas\":\"0x59682f10\"} for bundler address: 0x75c033055cd4f144d51b59b35dae02d91be03e74 for transactionId: 0x18a9c030ba977a4e3360be492b1867e34728397a1ef121cf686844288150cfb4 on chainId: 80001",
    "path": "src/services/transaction-service/EVMTransactionService.js"
  },
  "resource": {
    "type": "k8s_container",
    "labels": {
      "project_id": "biconomy-test-397415",
      "namespace_name": "qabundler",
      "cluster_name": "with-gcplb",
      "container_name": "bundlers-pod",
      "location": "us-east1-b",
      "pod_name": "bundlers-statefulset-1"
    }
  },
  "timestamp": "2023-10-03T09:07:13.529237399Z",
  "severity": "INFO",
  "labels": {
    "k8s-pod/namespace": "qabundler",
    "k8s-pod/statefulset_kubernetes_io/pod-name": "bundlers-statefulset-1",
    "k8s-pod/app_kubernetes_io/name": "bundlers",
    "k8s-pod/app": "bundlers",
    "compute.googleapis.com/resource_name": "gke-with-gcplb-default-pool-71afda7e-fbdt",
    "k8s-pod/controller-revision-hash": "bundlers-statefulset-566644c5b4",
    "k8s-pod/app_kubernetes_io/instance": "qabundler-test-bundler"
  },
  "logName": "projects/biconomy-test-397415/logs/stdout",
  "receiveTimestamp": "2023-10-03T09:07:15.612152409Z"
}
```

#### python code 
```


def submitted_to_blockchain(data, txid_nonce):
  result = []
  for e in data:
      if e.get("jsonPayload") and e["jsonPayload"].get("message"):
        if "Sending transaction to network" in e["jsonPayload"]["message"]:
          s =  e["jsonPayload"]["message"]
          transaction_id_match = re.search(r'transactionId: (\w+)', s)
          transactionId = transaction_id_match.group(1) if transaction_id_match else None
          
          # Extract nonce from the JSON
          _result = {
                "timestamp": e["jsonPayload"]["timestamp"],
                "transactionId": transactionId, 
                "pod_name":  e["resource"]["labels"]["pod_name"],
                "message": "Tx submitted on blockchain"
                }
          try:
            _result.update({"nonce": txid_nonce[transactionId]})
          except Exception:
            _result.update({"nonce": None})

          result.append(_result)

  return result
```

```
submitted = submitted_to_blockchain(data, txid_nonce)
```

## Phase 4: Transaction Execution

```
{
  "insertId": "akmjpt3hh4udkj42",
  "jsonPayload": {
    "message": "Transaction execution response for transactionId 0x1e80dc26bc1307e1119d657dd5ca7147d7cdeac8b0560e035228021204da62a7: {\"success\":true,\"transactionResponse\":{\"type\":2,\"chainId\":80001,\"nonce\":19,\"maxPriorityFeePerGas\":{\"type\":\"BigNumber\",\"hex\":\"0x59682f10\"},\"maxFeePerGas\":{\"type\":\"BigNumber\",\"hex\":\"0x861c4698\"},\"gasPrice\":null,\"gasLimit\":{\"type\":\"BigNumber\",\"hex\":\"0x22a6ae\"},\"to\":\"0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789\",\"value\":{\"type\":\"BigNumber\",\"hex\":\"0x00\"},\"data\":\"0x1fad948c0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000896aacdb5e0e280c39f61da7004f5f30993678c400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d94de4af1ffef0a257e2895318c01e8de49ceab1000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000001b5f7000000000000000000000000000000000000000000000000000000000000ead400000000000000000000000000000000000000000000000000000000000122a400000000000000000000000000000000000000000000000000000000861c46980000000000000000000000000000000000000000000000000000000059682f100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000244912ccaa3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000020000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000001758f42af7026fbbb559dc60ece0de3ef81f665e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e49795300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002440d097c3000000000000000000000000f73501e5f730d1236a7921ff5a3e965b1e497953000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d4000031dd6d9d3a133e663660b959162870d755d4000000000000000000000000d39222801871b185ca8db59a62153ee6f07c03880000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000004136ac64424a4b3a75ce12e9057f9d5e43c881ba364e2ad7a9e16612ff10a1eed02c656478c1304ccd54742074b44641e7281ff46dd22fc36c88f041fbab5c62211c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041cd2e2a88d0ff63b8690bc6bcadd4e9802500fce7d294eb9d42becad975ec6b1f13235db7e058aaafcca1585085d7aeba46fcafff3c7ce1059ac960b4767c793f1b00000000000000000000000000000000000000000000000000000000000000\",\"accessList\":[],\"hash\":\"0x87440f4a4b7938a362892089fbd51fa8a95aea238d77b9f3b4f518d13748199e\",\"v\":1,\"r\":\"0x1e66db39a7c6181b8e04872ce4099d4c41231cf42fb5d0049e833a0438e46a1b\",\"s\":\"0x062174f47f2dbd7f830f0c581574f563761fa1fc4395709a789bb67d6943df02\",\"from\":\"0x896Aacdb5E0E280c39f61DA7004f5F30993678c4\",\"confirmations\":0}} on chainId 80001",
    "path": "src/services/transaction-service/EVMTransactionService.js",
    "hostname": "bundlers-statefulset-0",
    "level": "info",
    "timestamp": "2023-10-03 09:07:13 882"
  },
  "resource": {
    "type": "k8s_container",
    "labels": {
      "pod_name": "bundlers-statefulset-0",
      "container_name": "bundlers-pod",
      "namespace_name": "qabundler",
      "cluster_name": "with-gcplb",
      "project_id": "biconomy-test-397415",
      "location": "us-east1-b"
    }
  },
  "timestamp": "2023-10-03T09:07:13.882490751Z",
  "severity": "INFO",
  "labels": {
    "k8s-pod/app": "bundlers",
    "k8s-pod/app_kubernetes_io/instance": "qabundler-test-bundler",
    "compute.googleapis.com/resource_name": "gke-with-gcplb-default-pool-71afda7e-fbdt",
    "k8s-pod/statefulset_kubernetes_io/pod-name": "bundlers-statefulset-0",
    "k8s-pod/app_kubernetes_io/name": "bundlers",
    "k8s-pod/namespace": "qabundler",
    "k8s-pod/controller-revision-hash": "bundlers-statefulset-566644c5b4"
  },
  "logName": "projects/biconomy-test-397415/logs/stdout",
  "receiveTimestamp": "2023-10-03T09:07:15.520648899Z"
}
```

#### python code
```
def execution_txids(data, txid_nonce):
  result = []
  for e in data:
    if e.get("jsonPayload") and e["jsonPayload"].get("message"):
      if "Transaction execution response for transactionId" in e["jsonPayload"]["message"]:
        json_string =  e["jsonPayload"]["message"]
        
        
        transaction_id_match = re.search(r'transactionId (0x[a-fA-F0-9]{64})', json_string)
        transactionId = transaction_id_match.group(1) if transaction_id_match else None


        transaction_hash_match = re.search(r'\"hash\":\"(0x[a-fA-F0-9]{64})\"', json_string)
        transactionHash = transaction_hash_match.group(1) if transaction_id_match else None
        _result = {
            "timestamp": e["jsonPayload"]["timestamp"], 
            "transactionId": transactionId, 
            "pod_name":  e["resource"]["labels"]["pod_name"], 
            "transactionHash": transactionHash,
            "message": "Execution completed"
            }
        
        try:
          _result.update({"nonce": txid_nonce[transactionId]})
        except:
           _result.update({"nonce": None})
        result.append(_result)
  return result

```

```
execution = execution_txids(data, txid_nonce)
```

## Result:
Concatanate all the arrays and print, It will show the the execution of all the userop submitted 

```
userop_nonces = userop_submitted_noce(data)
nonceTxIds, txid_nonce = nonce_to_txids(data)
submitted = submitted_to_blockchain(data, txid_nonce)
execution = execution_txids(data, txid_nonce)

result = userop_nonces + nonceTxIds + submitted + execution
sorted_data = sorted(result, key=lambda x: x['timestamp'])
for entry in sorted_data:
    print(f"{entry['timestamp']}\t{entry['pod_name']}\t{entry['nonce']}\t{entry['message']}")

```