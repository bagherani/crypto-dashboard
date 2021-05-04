app.controller('home', ['$http', '$timeout', function ($http, $timeout) {

    var self = this;
    self.symbols = [];
    self.items = {};

    function init() {
        self.getSymbols();

        const socket = io.connect("http://localhost:3004", {
            reconnection: true
        });

        socket.on('connect', function () {
            console.log('connected to localhost:3004');
            socket.on('data', function (data) {
                $timeout(() => {
                    Object.keys(data).forEach(key => {
                        self.items[key] = data[key];
                    })
                })
            });
        });
    }

    self.getSymbols = function () {
        $http.get('/api/symbols').then((res) => {
            var result = res.data;
            self.symbols = result.data;

            result.data.forEach(symbol => {
                self.items[symbol] = {};
            });
        })
    }

    init();
}])