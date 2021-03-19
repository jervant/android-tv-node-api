const debug = require('debug')('server:router');

const url = require('url');

const errors = require('../../errors');

const response = (res, data = {}) => {

    if(typeof data === 'object'){
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(data);
}

module.exports = (sdk) => {
    return async (req, res) => {

        try{
            const {query} = url.parse(req.url, true);

            debug('Query', {...query});

            if(query.action){
                const action = query.action.trim();

                let result = {};
                const data = query.data ? query.data.toLowerCase() : '';

                switch (action){
                    case 'open':
                        result = await sdk.launchApp(data.replace('open', ''));
                        break;
                    case 'power':
                        result = await sdk.togglePower(data);
                        break;
                    default:
                        try{
                            result = await sdk[action](data);
                        }catch (e){
                            throw new errors.BadRequestError('Action not supported', [e.message]);
                        }
                }

                response(res, result);
            }else{
                throw new errors.BadRequestError('No action specified');
            }
        }catch (e){
            console.error(e);

            res.writeHead(e.statusCode, { 'Content-Type': 'application/json' });

            const data = {
                ...e
            }

            if(process.env.DEBUG){
                data.stack = e.stack;
            }

            res.end(JSON.stringify(data));
        }
    };
};
