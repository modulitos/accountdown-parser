var test = require('tape')
var level = require('levelup')
var accountdown = require('accountdown')
var accountdownParser = require('../index.js')
var sublevel = require('subleveldown')
var hammock = require('hammock')
var validator = require('is-my-json-valid')

var db = level('test', { db: require('memdown') })

function accountdownBasic (db, prefix) {
  return require('accountdown-basic')(db, prefix, { key: 'key' })
}

accountdown = accountdown(sublevel(db, 'accounts'), {
  login: { basic: accountdownBasic }
})
// TODO: refactor into fixtures and separate the test functions
var accountdownModel = require('accountdown-model')(accountdown, {
  db: db,
  properties: {
    username: { type: 'string' },
    email: { type: 'string' },
    profile: { type: 'string' }
  },
  required: ['username', 'email'],
  indexKeys: ['username', 'email', 'profile']
})

var validate = validator({
  required: true,
  type: 'object',
  properties: {
    login: {
      required: false,
      type: 'object',
      properties: {
        basic: {
          required: true,
          type: 'object',
          properties: {
            key: {
              required: true,
              type: 'string'
            },
            password: {
              required: true,
              type: 'string'
            }
          }
        }

      },
      value: {
        required: true,
        type: 'object',
        properties: {
          key: {
            required: true,
            type: 'string'
          },
          admin: {
            required: false,
            type: 'boolean'
          },
          color: {
            required: false,
            type: 'string'
          },
          username: {
            required: false,
            type: 'string'
          },
          email: {
            required: false,
            type: 'string'
          }
        }
      }

    }
  }
}, {
  verbose: true
})
opts = {
  validate: validate,
  format: function (body) {
    body.value.admin = !!(body.value.admin)
    if (body.value.key && body.login) {
      body.login.basic.key = body.value.key
    }
    return body
  },
  updateLoginCreds: function (account) {
    return Object.prototype.hasOwnProperty.call(account, 'login')
  }
}
var parser = accountdownParser(accountdownModel, opts)

test('create account from form', function (t) {
  t.plan(5)
  var request = hammock.Request({
    method: 'GET',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    url: '/somewhere'
  })
  var body = 'value%5Bemail%5D=test%40test.com&value%5Busername%5D=test&' +
    'login%5Bbasic%5D%5Bpassword%5D=test&value%5Bkey%' +
    '5D=6ddae770-1932-11e5-9c87-a938ac89c738&value%5Bcolor%5D=rgb%' +
    '2869%2C+61%2C+88%29&value%5Badmin%5D=checked'

  request.end(body);
  var response = hammock.Response();

  parser.create(request, response, function(err, account) {
    t.ifError(err)
    t.notOk(err)
    t.ok(account)
    t.ok(account.created) // this time will differ from the expected account time

    var expectedAccount = {
      email: 'test@test.com',
      username: 'test',
      key: '6ddae770-1932-11e5-9c87-a938ac89c738',
      color: 'rgb(69, 61, 88)',
      admin: true,
      created: '2015-06-23T04:22:20.189Z',
      updated: null
    }
    account.created = expectedAccount.created
    t.equals(JSON.stringify(account), JSON.stringify(expectedAccount)) // error with timestamps
  })
});

test('invalidate account without key', function (t) {
  t.plan(2)
  var request = hammock.Request({
    method: 'GET',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    url: '/somewhere'
  })
  var body = 'value%5Bemail%5D=test%40test.com&value%5Busername%5D=test&' +
    'login%5Bbasic%5D%5Bpassword%5D=test&value%5Bcolor%5D=rgb%' +
    '2869%2C+61%2C+88%29&value%5Badmin%5D=checked'

  request.end(body)
  var response = hammock.Response()

  parser.create(request, response, function(err, account) {
    t.ok(err)
    t.notOk(account)
  })
});

test('update account color, admin, username', function (t) {
  t.plan(7)
  var key = '6ddae770-1932-11e5-9c87-a938ac89c738'
  console.log("test update account, gettting key")
  accountdownModel.get(key, function (err, oldAccount) {
    t.ifErr(err)
    t.ok(oldAccount)

    var request = hammock.Request({
      method: 'GET',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      url: '/somewhere'
    })
    var body = 'value%5Bemail%5D=test%40test.com&value%5Busername%5D=test2&' +
      'value%5Bkey%' +
      '5D=6ddae770-1932-11e5-9c87-a938ac89c738&value%5Bcolor%5D=rgb%' +
      '2869%2C+62%2C+89%29&value%5Badmin%5D='
    request.end(body);
    var response = hammock.Response();

    parser.update(request, response, key, function(err, account) {
      t.ifError(err)
      t.notOk(err)
      t.ok(account)
      t.ok(account.created) // this time will differ from the expected account time

      var expectedAccount = {
        email: 'test@test.com',
        username: 'test2',
        key: '6ddae770-1932-11e5-9c87-a938ac89c738',
        color: 'rgb(69, 62, 89)', // original color: (69, 61, 88)
        admin: false,
        //admin: false,
        created: '2015-06-23T04:22:20.189Z',
        updated: null
      }
      account.created = expectedAccount.created
      t.equals(JSON.stringify(account), JSON.stringify(expectedAccount)) // error with timestamps
      // TODO: Use accountdown-model to assert existence/absence of old and new account
    })
  })
});
// TODO: Update password example
//test('update account login', function (t) {
//  t.plan(2)
//  var key = '5D=6ddae770-1932-11e5-9c87-a938ac89c738'
//  accountdownModel.get(key, function (err, account) {
//    t.ifErr(err)
//    t.ok(account)
//
//    var request = hammock.Request({
//      method: 'GET',
//      headers: {
//        'content-type': 'application/x-www-form-urlencoded'
//      },
//      url: '/somewhere'
//    })
//    var body = 'value%5Bemail%5D=test%40test.com&value%5Busername%5D=test&' +
//      'login%5Bbasic%5D%5Bpassword%5D=test&value%5Bkey%' +
//      '5D=6ddae770-1932-11e5-9c87-a938ac89c738&value%5Bcolor%5D=rgb%' +
//      '2869%2C+62%2C+89%29&value%5Badmin%5D=checked'
//    request.end(body);
//    var response = hammock.Response();
//
//    var expectedAccount = {
//      email: 'test@test.com',
//      username: 'test',
//      key: '6ddae770-1932-11e5-9c87-a938ac89c738',
//      color: 'rgb(69, 62, 89)',
//      admin: true,
//      created: '2015-06-23T04:22:20.189Z',
//      updated: null
//    }
//    parser.update(request, response, function(err, account) {
//      t.ifError(err)
//      t.notOk(account)
//    })
//  })
//});
