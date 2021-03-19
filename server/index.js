const debug = require('debug')('server');

const http = require('http');

const utils  = require('../utils');
const router = require('./router');

module.exports.start = (sdk, port = 8080) => {
    const server = http.createServer(router(sdk));

    server.listen(port, () => {
        debug('Listening on', {
            ip: utils.getServerIp(),
            port
        });
    });
};

