// import crypto from 'crypto-js';
// import { promises, existsSync } from 'fs';

// const KEY_SIZE = 32;
// const PBKDF2_ITERATIONS = 310000;
// const AES_PADDING = crypto.pad.Pkcs7;
// const AES_MODE = crypto.mode.CBC;

// const encryptConfig = async (
//   passphrase: string,
//   envPath = './config/config.json',
//   outputPath = './config.json.enc',
// ) => {
//   if (!existsSync(envPath)) {
//     throw new Error(`Invalid ENV Path: ${envPath}`);
//   }
//   const plaintext = await promises.readFile(envPath, 'utf8');

//   // Derive a Key using the PBKDF2 algorithm from the passsphrase
//   const salt = crypto.lib.WordArray.random(128 / 8);
//   const key = crypto.PBKDF2(passphrase, salt, {
//     keySize: KEY_SIZE / 32,
//     iterations: PBKDF2_ITERATIONS,
//   });

//   const iv = crypto.lib.WordArray.random(128 / 8);
//   const encrypted = crypto.AES.encrypt(plaintext, key, {
//     iv,
//     padding: AES_PADDING,
//     mode: AES_MODE,
//   });

//   // Use HMAC to check data tampering during decryption
//   const hash = crypto.HmacSHA256(plaintext, key);
//   const hashInBase64 = crypto.enc.Base64.stringify(hash);

//   // Append salt and IV for use in Decryption
//   const ciphertext = hashInBase64.toString()
//     + salt.toString()
//     + iv.toString()
//     + encrypted.toString();

//   await promises.writeFile(outputPath, ciphertext);
//   console.log('completed');
//   process.exit(1);
// };

// const passphrase = process.env.CONFIG_PASSPHRASE;
// if (passphrase !== undefined) {
//   encryptConfig(passphrase);
// } else {
//   console.error('CONFIG_PASSPHRASE environment variable is not defined');
// }

import crypto from 'crypto-js';
import { promises, existsSync } from 'fs';

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

const encryptConfig = async (
  passphrase: string,
  configName: string
) => {
  const envPath = `./config/${configName}`
  const outputPath = `./${configName}.enc`

  if (!existsSync(envPath)) {
    throw new Error(`Invalid ENV Path: ${envPath}`);
  }
  const plaintext = await promises.readFile(envPath, 'utf8');

  // Derive a Key using the PBKDF2 algorithm from the passphrase
  const salt = crypto.lib.WordArray.random(128 / 8);
  const key = crypto.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE / 32,
    iterations: PBKDF2_ITERATIONS,
  });

  const iv = crypto.lib.WordArray.random(128 / 8);
  const encrypted = crypto.AES.encrypt(plaintext, key, {
    iv,
    padding: AES_PADDING,
    mode: AES_MODE,
  });

  // Use HMAC to check data tampering during decryption
  const hash = crypto.HmacSHA256(plaintext, key);
  const hashInBase64 = crypto.enc.Base64.stringify(hash);

  // Append salt and IV for use in Decryption
  const ciphertext = hashInBase64 + salt.toString() + iv.toString() + encrypted.toString();

  await promises.writeFile(outputPath, ciphertext);
  console.log('Encryption completed');
};

// Main execution
const main = () => {
  const passphrase = process.env.CONFIG_PASSPHRASE;
  const configName = process.argv[2]; // Taking the second command line argument as configName

  if (!passphrase) {
    console.error('CONFIG_PASSPHRASE environment variable is not defined');
    process.exit(1);
  }

  if (!configName) {
    console.error('No ENV Path provided');
    process.exit(1);
  }

  encryptConfig(passphrase, configName).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
};

main();