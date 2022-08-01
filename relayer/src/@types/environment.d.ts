declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_PATH_INDEX: string;
    }
  }
}

export {};
