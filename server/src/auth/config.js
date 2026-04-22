const path = require('path')

const AUTH_SECRET = process.env.AUTH_SECRET || 'qi-rdp-dev-secret'
const AUTH_EXPIRES_IN = process.env.AUTH_EXPIRES_IN || '7d'
const USER_STORE_PATH =
  process.env.USER_STORE_PATH || path.join(process.cwd(), 'data', 'users.json')

module.exports = {
  AUTH_SECRET,
  AUTH_EXPIRES_IN,
  USER_STORE_PATH,
}
