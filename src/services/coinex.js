const WebSocket = require("ws");
const EventEmitter = require('events').EventEmitter;
const axios = require('axios');

class Coinex extends EventEmitter {
    _client;
    /**
     * @type {Array<string>}
     */
    symbols;

    IDs;

    constructor() {
        super();

        this.IDs = {};

        this._client = new WebSocket('wss://socket.coinex.com/', {
            perMessageDeflate: false,
            handshakeTimeout: 15000,
        });

        this._client.on('open', (ex) => { this._checkConnection(ex) });

        this._client.on('message', (data) => {
            const response = JSON.parse(data);
            if (!response.error)
                this.emit("symbolResult", { symbol: this.IDs[response.id], result: response.result });
        });
    }

    getMarketSymbols() {
        axios.default.get('https://api.coinex.com/v1/market/list').then((resp) => {
            var data = resp.data.data.filter(x => x.indexOf("USDT") > -1);
            this.emit('symbols', data)
        }).catch(ex => {
            console.log('error getting symbols list', ex);
            this.emit('symbols', [])
        })
    }

    querySymbol(symbol, seconds) {
        var id = Object.keys(this.IDs).length + 1;
        if (this.IDs[id] == undefined)
            this.IDs[id] = symbol;
        this._client.send(JSON.stringify({
            "method": "state.query",
            "params": [symbol, seconds],
            "id": id
        }));
    }

    _checkConnection(err) {
        if (err) {
            console.log('error in connecting to coinex websocket server.');
            console.log('try reconnecting in 5 seconds...');
            setTimeout(() => {
                this._client.on('open', (ex) => { this._checkConnection(ex) });
            }, 5000);
        }
        else
            this.emit('connected');
    }

    // _subscribeToCoinex(err) {
    //     if (err) {
    //         console.log('error in connecting to coinex websocket server.');
    //         console.log('try reconnecting in 5 seconds...');
    //         setTimeout(() => {
    //             this._client.on('open', (ex) => { this._subscribeToCoinex(ex) });
    //         }, 5000);
    //     }
    //     else {
    //         this._client.send(JSON.stringify({
    //             "method": "state.subscribe",
    //             "params": [],
    //             "id": 1
    //         }));

    //         this._client.send(JSON.stringify({
    //             "method": "state.query",
    //             "params": ["CETUSDT", 3600],
    //             "id": 1001
    //         }));

    //         axios.default.get('https://api.coinex.com/v1/market/list').then((resp) => {
    //             this.symbols = resp.data.data;

    //             this._client.send(JSON.stringify({
    //                 "method": "deals.subscribe",
    //                 "params": this.symbols,
    //                 "id": 2,
    //             }))
    //         }).catch(ex => {
    //             console.log('error getting symbols list', ex);
    //             this.symbols = [];
    //         })


    //     }
    // }
}


module.exports = new Coinex()