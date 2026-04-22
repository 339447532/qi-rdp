const jwt = require('jsonwebtoken')
const { AUTH_EXPIRES_IN, AUTH_SECRET } = require('./config')

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    recentConnections: user.recentConnections || [],
    createdAt: user.createdAt,
  }
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
    },
    AUTH_SECRET,
    { expiresIn: AUTH_EXPIRES_IN },
  )
}

function verifyUserToken(token) {
  const payload = jwt.verify(token, AUTH_SECRET)
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
  }
}

module.exports = {
  sanitizeUser,
  signUserToken,
  verifyUserToken,
}
