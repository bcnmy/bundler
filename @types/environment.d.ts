declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CONFIG_PASSPHRASE: string;
    }
  }
}

export {};
