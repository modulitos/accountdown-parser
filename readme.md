# accountdown-parser

Account creation and user input validation for [accountdown](https://github.com/substack/accountdown) using json-schema. Primary usage is on the server.

# example

## create an accountdown-parser instance and define a json-schema

``` js
  var validator = require('is-my-json-valid');
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
              uuid: {
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
  });
  opts = {
    validate: validate,
    format: function (body) {
      body.value.admin = !!(body.value.admin);
      if (body.value.key && body.login) {
        body.login.basic.uuid = body.value.key;
      }
      return body;
    },
    updateLoginCreds: function (account) {
      return account.hasOwnProperty('login');
    }
```


# methods

## var p = accountdown-parser(accountdown, opts)

Return a parser instance `p` given an accountdown instance `a`.

Set `opts.validate` as an instance of [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) to define the schema that will be validated for each user instance.

Set an optional `opts.format` to define how client-side requests should be parsed.

Another optional, but useful, `opts.updateLoginCreds` function defines whether the client's input is updating the login creds, which will require deletion and re-creation of the account when it returns true. Otherwise, only the account's value will be updated.


## p.create(req, res, callback)

`req`, `res`: Parses the `req` and `res` objects using the [body](https://github.com/Raynos/body)'s `body/any` module, along with a [querystring](https://www.npmjs.com/package/qs), and creates an account

Internally, all accounts are created with the key generated from [uuid](https://github.com/shtylman/node-uuid), version 1.

`callback(err, account)` fires with any errors or an `account` containing the account values.

## p.update(req, res, callback)

The same as `p.create` except the function `opts.updateLoginCreds` is checked to determine whether to delete and recreate the accounts (when `opts.updateLoginCreds` exists and returns true), otherwise the new accounts values are `put` into the new account.

# install

With [npm](https://npmjs.org/package/npm) do:

```
npm install accountdown-parser
```





