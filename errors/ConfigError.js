const ServiceError = require('./ServiceError');

class ConfigError extends ServiceError{
    constructor (errors) {
        super('Bad config', errors, 'BadConfig');
    }
}

module.exports = ConfigError;
