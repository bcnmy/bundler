# Configuring the Bundler

Configuring the Bundler is a bit complicated and involves multiple configuration sources:

1. **Secret config**: relayer keys are kept inside [src/config/config.json](./config.json) and encrypted using `ts-node encrypt-config.ts` which produces a [config.json.enc](../../config.json.enc) encrypted file in the project root folder. The secret config should **never** be pushed to this repo.
2. **Default config**: default (non-secret) values are kept in [config/default.json](../../config/default.json) and they contain parameters that are shared across all environments, such as network constants etc. The default config is pushed to the repo.
3. **Environment specific configs**: these are environment specific configs that contain both (semi)private data like RPC URLs but also allow us to override **any** of the values specified in the default config. Each environment has it's own file (`development.json`, `production.json` and so on) and these files should **never** be pushed to this repo, the only exception is [test.json](../../config/test.json) which is used in tests.

## 👶🏻 First setup instructions

The following setup is for Polygon Mumbai that you can use for local development, the same steps apply for all networks:

1. Create the `src/config/config.json` file using the template [src/config/config.template.json](config.template.json):
   1. Change the seed, address & private key in all relay managers
   2. (Optional) If you want to actually relay transactions to the network, you have to send some tokens the relayer address you specified in the previous step, so the bundler can pay for gas. You have to do this for every network you want to use, in this example we are using Mumbai only, so we need some Mumbai MATIC.
2. Create the `.env` file using the template [.env-example](../../.env-example) in the root directory:
   1. Change the `CONFIG_PASSPHRASE` value, you can use any string you want. The only thing that's important is that you use the same passphrase when you are encrypting the config (in the next step).
3. Encrypt the config file you created in step (1) using the CONFIG_PASSPHRASE you specified in step (2):
   1. Set the CONFIG_PASSPHRASE in your local terminal environment before running the encryption script: `export CONFIG_PASSPHRASE=<YOUR_PASSPHRASE>`
   2. Run the encryption script: `cd src && ts-node encrypt-config.ts`
   3. It should say `completed` without logging any errors.
4. Create the `config/development.json` file using the template `config/development.template.json`:
   1. Update the RPC URL for Mumbai (80001). You will need a **private** RPC endpoint for this, either you create a free account with a provider (like Alchemy) or you ping the DevOps team for access to our company provider accounts. Using a public RPC URL probably won't work because public providers have strict rate limits.
   2. Because this is our primary config file, it changes often and you may need to change some other variables by the time you are reading this. The best approach is to ping your colleague for a working config file.
5. 🎉 That's it, the Bundler is configured to run on Polygon Mumbai (80001). Refer back to the instructions in the main [README.md](../../README.md) file to run the Bundler server locally.

## Migrating from the old config system (V1) to config V2

The Bundler previously used a custom-built configuration system that read the default values from the [static-config.json](./static-config.json) file and merged it with the decrypted config from the [config.json](./config.json) file. We call this Config V1.

The new config system (V2) uses the popular node config package that gives us more flexibility while providing some best-practice patterns like _hierarchical config_ and forcing us to use a industry-standard config file approach (the same one Nest.js uses).

This is what changed:

- All of the new config files are in the [config](../../config/) directory
- Everything that was inside [static-config.json](./static-config.json) is now in [default.json](../../config/default.json)
- Everything **except the relayer keys** that was in your local development [config.json](./config.json) file should now be in `../../config/development.json`.

### Migration instructions

Perform the following steps if you have old config files and you want to migrate to the new config system:

1. Copy the contents of your old (decrypted) `config.json` file and put them in a new file at `config/development.json`
   1. ❗ If you are migrating files for an environment that is not `development`, then create the appropriate file, for example `config/production.json` instead of `config/development.json` (don't create both).
   2. Pay attention to the `supportedNetworks` array in your new config file. Chains that are not specified there won't be enabled on this bundler, even if they exist in `default.json` (or they existed in the old `static-config.json`)
2. Open your new `config/development.json` file and delete the `relayerSeed` and `ownerAccountDetails` properties. ⚠️ Don't delete other properties in `relayerManagers` if they are there. This file shouldn't contain any private keys.
3. Open your old `config.json` and delete everything except the `relayerSeed` and `ownerAccountDetails` properties. The file should have the same format like [this template](./config.template.json).
4. ❗ Don't forget to re-encrypt your config!
5. 🎉 That's it! From now on, don't ever add anything to either `config.json` or `static-config.json`, use the new config files.

## Configuration Options

The best reference for supported configuration options is the `ConfigType` in [IConfig.ts](./interface/IConfig.ts), it lists and documents every variable.

Here are some most basic configuration options:

```
{
  // List of networks you want to enable on this Bundler instance.
  "supportedNetworks": [80001],
  "chains": {
    "providers": {
      // A list of providers for this network.
      // If more than one, we perform basic load balancing between providers.
      "80001": [
        {
          "url": "https://polygon-mumbai.g.alchemy.com/v2/yourapikey",
          "type": "private"
        }
      ]
    },
    // Alternatively, you can use this 'provider' property, but just don't.
    // It exists only for backwards compatibility.
    "provider": "https://polygon-mumbai.g.alchemy.com/v2/yourapikey"
  }
}
```

Also you could take a look at [config/default.json](../../config/default.json) and [src/config/config.template.json](config.template.json) for reference.

## Configuring Redis

There are two supported Redis setups:
- **Redis Cluster:** used on production, configured through the `redisCluster` config object
- **Single Redis instance:** used locally, configured through `dataSources.redisUrl`

If `redisCluster.host` is specified in the config (by default it's empty) the Bundler will try to connect to a cluster with a given hostname.
Otherwise it will try to connect to a single redis instance.

🚨 The two types of Redis are not compatible or interchangeable. If you try to connect to a single Redis instance using the `redisCluster` setting, the service will crash with `None of startup nodes is available`.

### Redis Cluster configuration

The only parameter you have to set is `redisCluster.host` and it should contain the **hostname** (without the port) of your Redis cluster.

Other parameters are optional and have default values. See the `new Cluster` options in the [ioredis docs](https://ioredis.readthedocs.io/en/latest/API/#new-clusterstartupnodes-options).

```
"redisCluster": {
  // 🔥 This is the only REQUIRED parameter
  "host": "https://your-redis-cluster-hostname"

  // All other parameters are optional because they have default values
  "port": 6379,
  "reconnectOnError": true,
  "enableOfflineQueue": true,
  "maxRedirections": 16,
  "retryDelayOnFailover": 100,
  "scaleReads": "master"
}
```

## FAQ & caveats

### The `relayerManagers` property is not merged correctly

If you notice the `relayerManagers` property not being merged correctly in hierarchical config files, that's because it's an **array of objects** (which is a bad practice for config files and should be fixed in the future) and it can't be merged property by property.
This means if you want to override the `relayerManagers` in some config file, you have to specify all of the relayer managers properties in the new file, not just the ones you want to override.
