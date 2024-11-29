import crypto from "crypto-js";
import fs, { existsSync } from "fs";

const KEY_SIZE = 32;
const PBKDF2_ITERATIONS = 310000;
const AES_PADDING = crypto.pad.Pkcs7;
const AES_MODE = crypto.mode.CBC;

function decryptConfig(): string {
  // const encryptedEnvPaPth = './config.json.enc';
  const encryptedEnvPath = process.argv[2]; // Taking the second command line argument as configName
  const passphrase = process.env.BUNDLER_CONFIG_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Passphrase for config required in .env file");
  }

  if (!existsSync(encryptedEnvPath)) {
    throw new Error(`Invalid ENV Path: ${encryptedEnvPath}`);
  }
  const ciphertext = fs.readFileSync(encryptedEnvPath, "utf8");
  // First 44 bits are Base64 encodded HMAC
  const hashInBase64 = ciphertext.substr(0, 44);

  // Next 32 bits are the salt
  const salt = crypto.enc.Hex.parse(ciphertext.substr(44, 32));

  // Next 32 bits are the initialization vector
  const iv = crypto.enc.Hex.parse(ciphertext.substr(44 + 32, 32));

  // Rest is encrypted .env
  const encrypted = ciphertext.substr(44 + 32 + 32);

  // Derive key from passphrase
  const key = crypto.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE / 32,
    iterations: PBKDF2_ITERATIONS,
  });

  let plaintext;
  try {
    const encryptedBytes = crypto.AES.decrypt(encrypted, key, {
      iv,
      padding: AES_PADDING,
      mode: AES_MODE,
    });
    plaintext = encryptedBytes.toString(crypto.enc.Utf8);
  } catch (e) {
    console.error(e);
    console.log("Incorrect password for decryption");
    process.exit();
  }

  // Verify HMAC
  const decryptedHmac = crypto.HmacSHA256(plaintext, key);
  const decryptedHmacInBase64 = crypto.enc.Base64.stringify(decryptedHmac);

  if (decryptedHmacInBase64 !== hashInBase64) {
    throw new Error("Error: HMAC does not match");
  }
  console.log(plaintext);
  return plaintext;
}

decryptConfig();
