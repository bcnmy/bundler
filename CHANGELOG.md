#### 2024-10-25

##### Build System / Dependencies

* **package.json:**  add commitizen and conventional changelogs (950a0582)

##### Chores

* **EPv0.7.0:**  :rocket: Allow Base Mainnet transactions (6d224305)
* **admin:**  :wastebasket: cleanup (bead9291)
*  remove unused weight (bac25c32)
*  add empty values.yaml to run "helm lint" (4cfb467a)
*  set CPU request to 2CPU, remove CPU limit (df39dbda)

##### New Features

* **admin:**  :sparkles: Cancel relayer transaction admin API (8297ad2f)
* **integrations:**
  *  :sparkles: Lisk Mainnet integration (5cabc50a)
  *  :sparkles: Metal L2 Mainnet & Lisk Testnet (09254289)
  *  :sparkles: Metal L2 Testnet integration (e11b5637)
  *  :sparkles: Kakarot Sepolia Testnet integration (0d9042be)
  *  :sparkles: Boba Mainnet integration (eac054d4)
  *  :sparkles: Boba Sepolia Testnet integration (2b1c3dc8)
  *  :sparkles: 5irechain mainnet integration (e691f387)
* **config:**  :poop: allow disabling fee validation for specific chains requested by TW (79fe70f1)
*  add antiAffinity to deploy sts in separate ndoes (4e0f0622)
*  enable-tolerations-affinity (cb472aef)

##### Bug Fixes

* **transaction-service:**  :bug: Fix transactions stuck in Linea mempool (ec400d4d)
*  make logging async (6ac59160)
*  remove podAffinityTerm (d17a8d0b)
*  wrap topologyKey value (c5f69cc3)
*  comment out weight in requiredDuringSchedulingIgnoredDuringExecution (f68fc086)
*  handle nil case for CPU limit (22c245bd)
* **integrations:**
  *  :bug: Increase Sei Mainnet funding amount (e4f8fa18)
  *  :bug: Fix 5irechain integration parameters (1c859618)
* **admin:**  :bug: Make healthchecks less sensitive to balance changes (27e8559a)
* **tw:**  :bug: Fix opBNB baseFeePerGas returning 0 (151f27ca)

##### Other Changes

*  instead of @ for image tag (e4bfa49e)
* bcnmy/bundler into fix/cancel-stuck-transactions (be3ac232)
*  EntryPoint v0.7 support" (4c3010f7)
*  EntryPoint v0.7 support (c05eb936)
