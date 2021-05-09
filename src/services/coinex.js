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

        this.connect();
    }

    connect() {
        this._client = new WebSocket('wss://socket.coinex.com/', {
            perMessageDeflate: false,
            handshakeTimeout: 15000,
        });

        this._client.onopen = () => {
            this.emit('connected');
        };

        this._client.onmessage = (data) => {
            const response = JSON.parse(data.data);
            if (!response.error) {
                if (Array.isArray(response.result)) {
                    this.emit("dealsResult", { symbol: this.IDs[response.id], result: response.result });
                }
                else {
                    this.emit("symbolResult", { symbol: this.IDs[response.id], result: response.result });
                }
            }
        };

        this._client.onclose = (e) => {
            console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
            setTimeout(() => {
                this.connect();
            }, 1000);
        };

        this._client.onerror = (err) => {
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            this._client.close();
        };
    }

    getMarketSymbols() {
        axios.default.get('https://api.coinex.com/v1/market/list').then((resp) => {
            var data = resp.data.data.filter(x => x.indexOf('USDT') > -1);
            this.emit('symbols', data)
        }).catch(ex => {
            console.log('error getting symbols list', ex);
            this.emit('symbols', [])
        })
    }

    queryDeals(symbol) {
        var id = Object.keys(this.IDs).length + 1;
        if (this.IDs[id] == undefined)
            this.IDs[id] = symbol;
        this._client.send(JSON.stringify({
            "method": "deals.query",
            "params": [symbol, 200, 0],
            "id": id
        }));
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

}


module.exports = new Coinex()