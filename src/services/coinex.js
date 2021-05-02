const WebSocket = require("ws");
const EventEmitter = require('events').EventEmitter;
const axios = require('axios');

class Coinex extends EventEmitter {
    _client;
    /**
     * @type {Array<string>}
     */
    symbols;

    constructor() {
        super();

        this._client = new WebSocket('wss://socket.coinex.com/', {
            perMessageDeflate: false,
            handshakeTimeout: 15000,
        });

        this._client.on('open', (ex) => { this._subscribeToCoinex(ex) });

        this._client.on('message', (data) => {
            const response = JSON.parse(data);

            this.emit(response.method, response.params);
        });
    }

    _subscribeToCoinex(err) {
        if (err) {
            console.log('error in connecting to coinex websocket server.');
            console.log('try reconnecting in 5 seconds...');
            setTimeout(() => {
                this._client.on('open', (ex) => { this._subscribeToCoinex(ex) });
            }, 5000);
        }
        else {
            this._client.send(JSON.stringify({
                "method": "state.subscribe",
                "params": [],
                "id": 1
            }));

            axios.default.get('https://api.coinex.com/v1/market/list').then((resp) => {
                this.symbols = resp.data.data;

                this._client.send(JSON.stringify({
                    "method": "deals.subscribe",
                    "params": this.symbols,
                    "id": 2,
                }))
            }).catch(ex => {
                console.log('error getting symbols list', ex);
                this.symbols = [];
            })


        }
    }
}


module.exports = new Coinex()