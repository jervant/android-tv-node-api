##Android TV Node.js API

Node.js API with minimal dependencies to control Android TVs with jointSPACE APIs.

Inspired by https://github.com/eslavnov/pylips

##Get started

###Create Configuration
1. Rename config.template.json file > config.json
2. Update the config file with your TVs IP Address 
  ```json
    {
        "server": {
            "port": 8080
        },
        "http": {
            "timeout": 5000,
            "retries": 3
        },
        "tv": {
            "host": "android:tv:ip:address"
        }
    }
  ```

###Install Dependencies
```shell
npm i
```

###Run
```shell
npm start
```

###Pair Your TV
1. Turn on your TV
2. You should see the pairing code displayed on the TV
3. Type the code intro the terminal prompt


###Enable Debug
```shell
export DEBUG-*
npm start
```
