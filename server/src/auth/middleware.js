const { verifyUserToken } = require('./token')

function parseBearerToken(header = '') {
  if (!header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

function requireAuth(req, res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization || '')
    if (!token) {
      res.status(401).json({ success: false, message: '缺少登录凭证' })
      return
    }

    req.user = verifyUserToken(token)
    next()
  } catch {
    res.status(401).json({ success: false, message: '登录凭证无效或已过期' })
  }
}

module.exports = {
  parseBearerToken,
  requireAuth,
}
