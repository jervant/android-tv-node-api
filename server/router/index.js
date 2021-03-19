const debug = require('debug')('server:router');

const url = require('url');

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
                        result = await sdk[action](data);
                }

                response(res, result);
                return;
            }

            res.writeHead(400, { 'Content-Type': 'application/json' });

            response(res, {
                error: 'No action specified'
            });
        }catch (e){
            res.writeHead(500, { 'Content-Type': 'application/json' });

            response(res, {
                error: 'Server Error',
                message: e.message
            });

            console.error(e);
        }
    };
};
