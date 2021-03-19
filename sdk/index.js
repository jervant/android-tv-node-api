const debug = require('debug')('sdk');

const needle   = require('needle');
const crypto   = require('crypto');
const readline = require('readline');

class Sdk {

    /**
     *
     * @param {Config} Config - Config instance
     */
    constructor (Config) {
        this.Config  = Config;
        this.config  = Config.get();
        this.request = needle;
    }

    /**
     *
     * @return {string} - Base url
     */
    get baseUrl () {
        return `${this.protocol}${this.host}:${this.port}/${this.apiVersion}`;
    }

    /**
     *
     * @return {String} - Host
     */
    get host () {
        return this.config.tv.host;
    }

    /**
     *
     * @return {String} - Protocol
     */
    get protocol () {
        return this.config.tv.protocol;
    }

    /**
     *
     * @param {String} protocol - Protocol value
     */
    set protocol (protocol) {
        this.config.tv.protocol = protocol;
    }

    /**
     *
     * @return {Number} - Port
     */
    get port () {
        return this.config.tv.port;
    }

    /**
     *
     * @param {Number} port - Port value
     */
    set port (port) {
        this.config.tv.port = port;
    }

    /**
     *
     * @return {String} - Api version
     */
    get apiVersion () {
        return this.config.tv.apiv;
    }

    /**
     *
     * @param {String} apiVersion - Api version value
     */
    set apiVersion (apiVersion) {
        this.config.tv.apiv = apiVersion;
    }

    /**
     *
     * @return {String} - Secret key
     */
    get secretKey () {
        return this.config.tv.secretKey;
    }

    /**
     *
     * @param {String} secretKey - Secret key value
     */
    set secretKey (secretKey) {
        this.config.tv.secretKey = secretKey;
    }

    /**
     *
     * @return {String} - Username
     */
    get username () {
        return this.config.tv.username;
    }

    /**
     *
     * @param {String} username - Username value
     */
    set username (username) {
        this.config.tv.username = username;
    }

    /**
     *
     * @return {String} - Password
     */
    get password () {
        return this.config.tv.password;
    }

    /**
     *
     * @param {String} password - Password value
     */
    set password (password) {
        this.config.tv.password = password;
    }

    /**
     *
     * @return {Number} - Max retries for http requests
     */
    get maxRetries () {
        return this.config.http.retries;
    }

    /**
     *
     * @return {Number} - Timeout value in milliseconds
     */
    get timeout () {
        return this.config.http.timeout;
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async init () {

        this.isPairing = false;

        if (!this.host) {
            throw new Error('Please set your TV\'s IP-address in the tv section in config.json');
        }

        if (!this.isPaired()) {

            if (!this.secretKey) {
                this.secretKey = this.generateRandomString();
            }

            this.username = this.generateRandomString(16);

            await this.pair();
        }
    }

    /**
     *
     * @return {boolean} - True or False value indicating if the TV is paired
     */
    isPaired () {

        return !!(this.username && this.password);
    }

    /**
     *
     * @param {Number[]} ports - Ports to check
     * @param {Number[]} versions - Supported versions
     * @return {Promise<Object>} - System version, protocol, port
     */
    async findApiVersionProtocolPort (ports = [1925], versions = [6, 5, 1]) {
        debug('Checking API version and port...', ports, versions);

        const protocol = 'http://';

        const data = {
            version : null,
            protocol: null,
            port    : null
        };

        for (const port of ports) {

            debug('Checking port', port);

            for (const version of versions) {
                debug('Checking version', version);

                const response = await this.request('GET', `${protocol}${this.host}:${port}/${version}/system`);

                if (!response) {
                    continue;
                }

                const {api_version, featuring} = response.body;

                debug('Got data from system', api_version, featuring);

                if (data.api_version) {
                    data.version = api_version.Major;
                } else {
                    debug('Could not find a valid API version! Will try to use: ', version);
                    data.version = version;
                }

                data.protocol = 'http://';
                data.port     = port;

                if (featuring && featuring.systemfeatures && featuring.systemfeatures.pairing_type === 'digest_auth_pairing') {
                    data.protocol = 'https://';
                    data.port     = port + 1;
                }

                return data;
            }
        }

        throw new Error('Can\t find system info, please check that you entered the correct IP address in the config.json file');
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async pair () {
        this.isPairing = true;

        const {version, port, protocol} = await this.findApiVersionProtocolPort();

        debug('System info', {version, port, protocol});

        this.apiVersion = version;
        this.protocol   = protocol;
        this.port       = port;

        const payload = {
            application_id: 'app.id',
        };

        const data = {
            device: this.getDeviceSpecJson(payload),
            scope : ['read', 'write', 'control']
        };

        debug('Pair', data);

        await this.pairRequest(data);
    }

    /**
     *
     * @param {String} question - Question to display for prompt
     * @return {Promise<string>} - Promise representing the stdin
     */
    prompt (question) {

        const rl = readline.createInterface({
            input : process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    }

    /**
     *
     * @param {Number} length - String length
     * @return {string} - Generated string
     */
    generateRandomString (length = 88) {
        return crypto.randomBytes(length).toString('hex').slice(0, length);
    }

    /**
     *
     * @param {Object} options - Device spec options
     * @return {{app_name: string, device_name: string, id: (String|string|*), type: string, device_os: string, app_id: string}} - Device specs
     */
    getDeviceSpecJson (options) {

        return {
            device_name: 'heliotrope',
            device_os  : 'Android',
            app_name   : 'Jslips',
            type       : 'native',
            app_id     : options.app_id || options.application_id,
            id         : this.username,
        };
    }

    /**
     *
     * @param {Object} data - Pair request data
     * @return {Promise<void>} - Promise
     */
    async pairRequest (data) {
        const response = await this.post('pair/request', data);

        if (!response) {
            throw new Error('Can\'t reach API');
        }

        if (response.error_id !== 'SUCCESS' && response.error_id !== 'CONCURRENT_PAIRING') {
            throw new Error(`Pair request error: ${response.error_id}`);
        }

        this.password = response.auth_key;

        const grantRequest = {
            auth  : {
                auth_AppId    : '1',
                auth_timestamp: response.timestamp,
            },
            device: {
                ...this.getDeviceSpecJson(data.device),
                auth_key: this.password
            }
        };

        grantRequest.auth.pin = await this.prompt('Enter onscreen passcode: ');

        debug('Grant request data: ', grantRequest);

        grantRequest.auth.auth_signature = this.createSignature(this.secretKey, `${grantRequest.auth_timestamp}${grantRequest.pin}`);

        await this.pairConfirm(grantRequest);

        await this.Config.sync();
    }

    /**
     *
     * @param {Object} data - Pair confirm request data
     * @return {Promise<void>} - Promise
     */
    async pairConfirm (data) {
        await this.post('pair/grant', data);
    }

    /**
     *
     * @param {String} secret - Secret
     * @param {String} toSign - Data to sign
     * @return {string} - Signature
     */
    createSignature (secret, toSign) {
        return crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(toSign).digest('base64');
    }

    /**
     *
     * @param {String} method - Method name
     * @param {String} path - Path uri
     * @param {Object} options - Request option
     *
     * @return {Promise<Object>} - Promise representing the body of the response
     */
    async send (method, path, data = {}) {
        debug('Sending request', ...arguments);

        const requestOptions = {
            compressed        : true,
            timeout           : this.timeout,
            rejectUnauthorized: false,
            json              : true
        }

        if (this.isPaired()) {

            debug('Set auth credentials', {
                user: this.username,
                pass: this.password,
            });

            requestOptions.username = this.username;
            requestOptions.password = this.password;
            requestOptions.auth     = 'digest';

        } else if (!this.isPairing) {
            throw new Error('Not Paired');
        }

        const response = await this.request(method.toUpperCase(), `${this.baseUrl}/${path}`, data, requestOptions);

        return response.body;
    }

    /**
     *
     * @param {String} path - Path
     * @param {Object} data - Data to send
     * @return {Promise<Object>} - Promise representing the response
     */
    async get (path, data = {}) {
        return this.send('get', path, data);
    }

    /**
     *
     * @param {String} path - Path
     * @param {Object} data - Data to send
     * @return {Promise<Object>} - Promise representing the response
     */
    async post (path, data = {}) {
        return this.send('post', path, data);
    }

    /**
     *
     * @return {Promise<Object>} - Promise representing the response
     */
    async getPowerState () {
        return this.get('powerstate');
    }

    /**
     *
     * @return {Promise<boolean>} - Promise object representing if the TV is turned on
     */
    async isOn () {
        try {
            const state = await this.getPowerState();

            debug('Power state: ', state);

            return ['on'].includes(state.powerstate.toLowerCase());
        } catch (e) {
            debug('Power state check error', e);

            return false;
        }
    }

    /**
     *
     * @param {String} key - Key to be pressed
     * @return {Promise<void>} - Promise
     */
    async keyPress (key) {
        await this.post('input/key', {
            key
        });
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async mute () {
        await this.keyPress('Mute');
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async play () {
        await this.keyPress('Play');
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async pause () {
        await this.keyPress('Pause');
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async stop () {
        await this.keyPress('Stop');
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async allowPowerOn () {
        await this.post('menuitems/settings/update', {
            values: [
                {
                    value: {
                        Nodeid: 2131230736,
                        data  : {
                            selected_item: 1
                        }
                    }
                }
            ]
        });
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async turnOff () {
        const isOn = await this.isOn();

        if (isOn) {
            await this.keyPress('Standby');
        }
    }

    /**
     *
     * @return {Promise<void>} - Promise
     */
    async turnOn () {
        const isOn = await this.isOn();

        if (!isOn) {
            await this.allowPowerOn();

            await this.request('POST', `http://${this.host}:8008/apps/ChromeCast`);

            //Wait for tv to turn on
            await setTimeout(() => {
            }, 1000);
        }
    }

    /**
     *
     * @param {String} action - Action 'on' or 'off'
     * @returns {Promise<void>} - Promise
     */
    async togglePower (action) {

        switch (action.toLowerCase()) {
            case 'on':
                await this.turnOn();
                break;
            case 'off':
                await this.turnOff();
                break;
            default:
                throw new Error(`Unsupported power action: ${action}`);
        }
    }

    /**
     *
     * @return {Promise<{Object}>} - Promise object representing the available applications
     */
    async getApplications () {
        const response = await this.get('applications');

        const applications = {};

        response.applications.forEach(item => {
            applications[item.label.toLowerCase()] = item;
        });

        return applications;
    }

    async launchApp (app) {
        await this.turnOn();

        const applications = await this.getApplications();

        const application = applications[app.toLowerCase()];

        if (!application) {
            debug('Unknown app: ', app);
            throw new Error('Unknown app');
        }

        await this.post('activities/launch', application);
    }

    /**
     *
     * @param {String} query - Query string to pass to Google Assistant
     */
    async assistant (query) {

        const data = {
            intent: {
                extras   : {query},
                action   : 'Intent {  act=android.intent.action.ASSIST cmp=com.google.android.katniss/com.google.android.apps.tvsearch.app.launch.trampoline.SearchActivityTrampoline flg=0x10200000 }',
                component: {
                    packageName: 'com.google.android.katniss',
                    className  : 'com.google.android.apps.tvsearch.app.launch.trampoline.SearchActivityTrampoline'
                }
            }
        };

        await this.post('activities/launch', data);
    }
}

module.exports = Sdk;
