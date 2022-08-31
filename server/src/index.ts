import 'dotenv/config';

(async () => {
  // call config class to setup config
  // can update config using the config instance.
  const server = await import('./server');
  if (result === 'done') {
    server.init();
    await import('./service-manager');
  }
})();
