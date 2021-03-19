const debug = require('debug')('config');

const {writeFile} = require('fs').promises;

/**
 * @class Config
 */
class Config {

    /**
     *
     * @param {String} pathToFile - Absolute path to config file
     */
    constructor (pathToFile) {
        debug('File', pathToFile);

        this.pathToFile = pathToFile;
        this.config = require(pathToFile);
    }

    /**
     *
     * @description Sync changes to file
     * @return {Promise<void>} - Promise
     */
    async sync () {
        debug('Sync to file: ', this.config);

        await writeFile(this.pathToFile, JSON.stringify(this.config));
    }

    get () {
        return this.config;
    }
}

module.exports = Config;
