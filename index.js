const path = require('path');

const server = require('./server');

const Sdk    = require('./sdk');
const Config = require('./config/index');

const config = new Config(path.join(__dirname, 'config.json'));

const sdk = new Sdk(config);

(async () => {
    await sdk.init();

    const port = config.get().server.port;

    await sdk.isOnline();

    await server.start(sdk, port);
})();
