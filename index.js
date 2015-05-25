var extend = require('extend')
var anyBody = require('body/any')

module.exports = Parser

function Parser (accountdown, opts) {
  if (!(this instanceof Parser)) {
    return new Parser(accountdown, opts)
  }
  if (!opts) opts = {}
  this.accountdown = accountdown
  // When updating an account, this function tells us whether the
  // login credentials have been updated as well, which determines
  // the whether we will update the login database as well
  this.updateLoginCreds = opts.updateLoginCreds
  // Instance of `is-my-json-valid` that defines the account schema
  // and performs user input validation
  this.validate = opts.validate
  // Formats the account request data that could not be done on the client
  this.format = opts.format

  this.parse = function(string, cb) {
    var parsedBody = require('qs').parse(string)
    return cb(null, parsedBody)
  }
}

Parser.prototype.create = function (req, res, cb) {
  var self = this

  anyBody(req, res, { querystring: { parse: this.parse }}, function(err, body) {
    // Body returned is always an object of the form:
    // { login: {...}, value: {key: .., ...} }
    if (err) return console.log("Parser: body did not parse:", err)
    if (self.format)  body = self.format(body)
    if (!self.validate(body))
      return console.log("\nParser.create: invalid body: ", self.validate.errors)

    self.accountdown.create(body.value.key, body, function (err) {
      if (err) return logOrCallbackOnError(cb, err)
      if (cb) return cb(err, body.value)
    })
  })
}

Parser.prototype.update = function (req, res, key, cb) {
  var self = this
  self.accountdown.get(key, function (err, existingAccountValue) {
    if (err) return console.log(err)
    anyBody(req, res, { querystring: { parse: self.parse }}, function(err, body) {
      // Body returned is always an object of the form:
      // { login: {...}, value: {key: .., ...} }
      if (err) return console.log("Body did not parse: ", err)
      if (self.format)  body = self.format(body)
      if (!self.validate(body))
        return console.log("\nParser.update: invalid body: ", self.validate.errors)

      // Overwrite all new values in existing account, and retain any values not
      // defined in the body
      body.value = extend(existingAccountValue, body.value)
      // If login credentials have changed, then we need to delete and re-create the account
      if (self.updateLoginCreds(body)) {
        self.accountdown.remove(body.value.key, function (err) {
          if (err) return console.log("err while deleting old account:", err)
          // If we are updating the username, then the password must be supplied as well...
          self.accountdown.create(body.value.key, body, function (err) {
            if (err) return logOrCallbackOnError(cb, err)
            if (cb) return cb(err, body.value)
          })
        })
      } else {
        self.accountdown.put(body.value.key, body.value, function (err) {
          if (err) return logOrCallbackOnError(cb, err)
          if (cb) return cb(err, body.value)
        })
      }

    })
  })
}

function logOrCallbackOnError (cb, err) {
  if (cb) return cb(err)
  return console.log(err)
}
