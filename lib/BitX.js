'use strict'

var https = require('https')
var path = require('path')
var querystring = require('querystring')
var config = require(path.join(__dirname, '..', 'package'))
var url = require('url')
var util = require('util')

var basePath = '/api/1/'
var extend = util._extend

var defaultHeaders = {
  'Accept': 'application/json',
  'Accept-Charset': 'utf-8',
  'User-Agent': 'node-bitx v' + config.version
}

function Luno (keyId, keySecret, options) {
  if (!(this instanceof Luno)) {
    return new Luno(keyId, keySecret, options)
  }
  if (typeof keyId === 'string') {
    this.auth = keyId + ':' + keySecret
  } else {
    options = keyId
  }
  options = options || {}
  this.hostname = options.hostname || 'api.luno.com'
  this.port = options.port || 443
  this.ca = options.ca
  this.pair = options.pair || 'XBTZAR'
}

Luno.prototype._request = function (method, resourcePath, data) {
  return new Promise((resolve, reject) => {
    var headers = extend({}, defaultHeaders)
    data = querystring.stringify(data)
    if (method === 'GET') {
      if (data) {
        resourcePath += '?' + data
      }
    } else if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Content-Length'] = Buffer.byteLength(data)
    }
    var options = {
      headers: headers,
      hostname: this.hostname,
      path: url.resolve(basePath, resourcePath),
      port: this.port,
      auth: this.auth,
      method: method
    }
    if (this.ca) {
      options.ca = this.ca
      options.agent = new https.Agent(options)
    }
    var req = https.request(options)

    req.on('response', function (res) {
      var response = ''

      res.setEncoding('utf8')

      res.on('data', function (data) {
        response += data
      })

      res.on('end', function () {
        if (res.statusCode !== 200) {
          reject(new Error('Luno error ' + res.statusCode + ': ' + response))
        }
        try {
          response = JSON.parse(response)
        } catch (err) {
          return reject(err)
        }
        if (response.error) {
          reject(response.error)
        }
        resolve(response)
      })
    })

    req.on('error', function (err) {
      reject(new Error(err))
    })

    if (method === 'POST' && data) {
      req.write(data)
    }

    req.end()
  })
}

Luno.prototype.getTicker = function (options) {
  var defaults = {
    pair: this.pair
  }
  return this._request('GET', 'ticker', extend(defaults, options))
}

Luno.prototype.getAllTickers = function () {
  return this._request('GET', 'tickers', null)
}

Luno.prototype.getOrderBook = function (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  var defaults = {
    pair: this.pair
  }
  this._request('GET', 'orderbook', extend(defaults, options), callback)
}

Luno.prototype.getTrades = function (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  var defaults = {
    pair: this.pair
  }
  this._request('GET', 'trades', extend(defaults, options), callback)
}

Luno.prototype.getOrderList = function (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  var defaults = {
    pair: this.pair
  }
  this._request('GET', 'listorders', extend(defaults, options), callback)
}

Luno.prototype.getLimits = function (callback) {
  console.log('node-bitx warning: Luno.getLimits is deprecated. Please use Luno.getBalance instead.')
  this._request('GET', 'BTCZAR/getlimits', null, callback)
}

Luno.prototype.stopOrder = function (orderId, callback) {
  var body = {
    order_id: orderId
  }
  this._request('POST', 'stoporder', body, callback)
}

Luno.prototype.postBuyOrder = function (volume, price, callback) {
  var body = {
    type: 'BID',
    volume: volume,
    price: price,
    pair: this.pair
  }
  this._request('POST', 'postorder', body, callback)
}

Luno.prototype.postMarketBuyOrder = function (volume, callback) {
  var body = {
    type: 'BUY',
    counter_volume: volume,
    pair: this.pair
  }
  this._request('POST', 'marketorder', body, callback)
}

Luno.prototype.postSellOrder = function (volume, price, callback) {
  var body = {
    type: 'ASK',
    volume: volume,
    price: price,
    pair: this.pair
  }
  this._request('POST', 'postorder', body, callback)
}

Luno.prototype.postMarketSellOrder = function (volume, callback) {
  var body = {
    type: 'SELL',
    base_volume: volume,
    pair: this.pair
  }
  this._request('POST', 'marketorder', body, callback)
}

Luno.prototype.getOrder = function (id, callback) {
  this._request('GET', 'orders/' + id, null, callback)
}

Luno.prototype.getBalance = function (asset, callback) {
  if (typeof asset === 'function') {
    callback = asset
    asset = null
  }
  this._request('GET', 'balance', asset ? {asset: asset} : null, callback)
}

Luno.prototype.getFundingAddress = function (asset, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  var defaults = {
    asset: asset
  }
  this._request('GET', 'funding_address', extend(defaults, options), callback)
}

Luno.prototype.createFundingAddress = function (asset, callback) {
  this._request('POST', 'funding_address', {asset: asset}, callback)
}

Luno.prototype.getTransactions = function (asset, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  var defaults = {
    asset: asset,
    offset: 0,
    limit: 10
  }
  this._request('GET', 'transactions', extend(defaults, options), callback)
}

Luno.prototype.getWithdrawals = function (callback) {
  this._request('GET', 'withdrawals/', null, callback)
}

Luno.prototype.getWithdrawal = function (id, callback) {
  this._request('GET', 'withdrawals/' + id, null, callback)
}

Luno.prototype.requestWithdrawal = function (type, amount, callback) {
  var options = {
    type: type,
    amount: amount
  }
  this._request('POST', 'withdrawals/', options, callback)
}

Luno.prototype.cancelWithdrawal = function (id, callback) {
  this._request('DELETE', 'withdrawals/' + id, null, callback)
}

module.exports = Luno
