var express = require('express');
var router = express.Router();

const coinex = require('../services/coinex')
var deals = {};
var states = {};

coinex.on('deals.update', data => {
  deals = data;
})

coinex.on('state.update', data => {
  states = data;
})

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express', deals: JSON.stringify(deals), states: JSON.stringify(states) });
});

module.exports = router;
