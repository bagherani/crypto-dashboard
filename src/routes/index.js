const ServerSocket = require('socket.io').Server;

var io = new ServerSocket({
  cors: { origin: '*' }
})
io.listen(3004);

var express = require('express');
var router = express.Router();
const coinex = require('../services/coinex')

var symbols = [];
var marketInterval = 0;
var items = {};

coinex.getMarketSymbols();

setInterval(() => {
  coinex.getMarketSymbols();
}, 36e5);

coinex.on('symbols', data => {
  symbols = data;

  data.forEach(symbol => {
    items[symbol] = {};
  });
})

coinex.on('connected', () => {
  if (marketInterval)
    clearInterval(marketInterval);

  var counter = 0;
  marketInterval = setInterval(() => {

    if (symbols.length > 0) {
      var symbol = symbols[counter];

      coinex.querySymbol(symbol, 300);

      setTimeout(() => {
        coinex.querySymbol(symbol, 900);
      }, 160);

      setTimeout(() => {
        coinex.querySymbol(symbol, 1800);
      }, 160 * 2);

      setTimeout(() => {
        coinex.querySymbol(symbol, 3600);
      }, 160 * 3);

      setTimeout(() => {
        coinex.querySymbol(symbol, 7200);
      }, 160 * 4);

      setTimeout(() => {
        coinex.querySymbol(symbol, 86400);
      }, 160 * 5);

      setTimeout(() => {
        coinex.queryDeals(symbol);
      }, 160 * 6);
    }

    counter++;
    if (counter > symbols.length)
      counter = 0;

  }, 1000);
})

setInterval(() => {
  io.emit('data', items);
}, 5e3);

coinex.on('symbolResult', res => {
  var { symbol, result: data } = res;
  Object.keys(data)
    .forEach(key => {
      items[symbol][key + data.period] = data[key];
    })
})

coinex.on('dealsResult', res => {
  var { symbol, result: data } = res;
  items[symbol]["buys"] = items[symbol]["buys"] || 0;
  items[symbol]["sells"] = items[symbol]["sells"] || 0;
  items[symbol]["buysCount"] = items[symbol]["buysCount"] || 0;
  items[symbol]["sellsCount"] = items[symbol]["sellsCount"] || 0;

  data.forEach(deal => {
    if (deal.type == 'sell') {
      items[symbol]["sellsCount"] = items[symbol]["sellsCount"] + 1;
      items[symbol]["sells"] += +deal.amount;
    }

    if (deal.type == 'buy')
      items[symbol]["buysCount"] = items[symbol]["buysCount"] + 1;
    items[symbol]["buys"] += +deal.amount;
  })

})

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Crypto Dashboard' });
});

router.get('/api/symbols', function (req, res, next) {
  res.send({ success: true, data: symbols });
});


module.exports = router;
