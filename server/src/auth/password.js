const crypto = require('crypto')

const KEY_LENGTH = 64

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false
  }

  const [salt, hash] = storedHash.split(':')
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH)
  const original = Buffer.from(hash, 'hex')

  if (original.length !== derived.length) {
    return false
  }

  return crypto.timingSafeEqual(original, derived)
}

module.exports = {
  hashPassword,
  verifyPassword,
}
