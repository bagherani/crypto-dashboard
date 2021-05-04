const ServerSocket = require('socket.io').Server;

var io = new ServerSocket({
  cors: { origin: '*' }
})
io.listen(3004);

var express = require('express');
const { querySymbol } = require('../services/coinex');
var router = express.Router();
const coinex = require('../services/coinex')

var symbols = [];
var marketInterval = 0;
var items = {};

coinex.getMarketSymbols();

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

      coinex.querySymbol(symbol, 900);

      setTimeout(() => {
        coinex.querySymbol(symbol, 1200);
      }, 500);

      setTimeout(() => {
        coinex.querySymbol(symbol, 3600);
      }, 1000);

      setTimeout(() => {
        coinex.querySymbol(symbol, 7200);
      }, 1500);

      setTimeout(() => {
        coinex.querySymbol(symbol, 86400);
      }, 2000);
    }

    counter++;
    if (counter > symbols.length)
      counter = 0;

  }, 2500);
})


coinex.on('symbolResult', res => {
  var { symbol, result: data } = res;
  Object.keys(data)
    .forEach(key => {
      items[symbol][key + data.period] = data[key];
    })

  io.emit('data', items);
})

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Crypto Dashboard' });
});

router.get('/api/symbols', function (req, res, next) {
  res.send({ success: true, data: symbols });
});


module.exports = router;
