const {
  addRecentConnection,
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} = require('./userStore')
const { hashPassword, verifyPassword } = require('./password')
const { sanitizeUser, signUserToken } = require('./token')
const { isUserOnline } = require('./presence')

function validateCredentials({ name, email, password }, { requireName = false } = {}) {
  if (requireName && !String(name || '').trim()) {
    const error = new Error('请输入用户名')
    error.status = 400
    throw error
  }

  if (!String(email || '').trim()) {
    const error = new Error('请输入邮箱')
    error.status = 400
    throw error
  }

  if (!String(password || '').trim() || String(password).length < 6) {
    const error = new Error('密码至少 6 位')
    error.status = 400
    throw error
  }
}

async function registerUser({ name, email, password }) {
  validateCredentials({ name, email, password }, { requireName: true })
  const user = await createUser({
    name,
    email,
    passwordHash: hashPassword(password),
  })

  return {
    user: sanitizeUser(user),
    token: signUserToken(user),
  }
}

async function loginUser({ email, password }) {
  validateCredentials({ email, password })
  const user = await findUserByEmail(email)

  if (!user || !verifyPassword(password, user.passwordHash)) {
    const error = new Error('邮箱或密码错误')
    error.status = 401
    throw error
  }

  return {
    user: sanitizeUser(user),
    token: signUserToken(user),
  }
}

async function getUserProfile(userId) {
  const user = await findUserById(userId)
  if (!user) {
    const error = new Error('用户不存在')
    error.status = 404
    throw error
  }

  return {
    ...sanitizeUser(user),
    recentConnections: (user.recentConnections || []).map((item) => ({
      ...item,
      favorite: Boolean(item.favorite),
      online: item.targetUserId ? isUserOnline(item.targetUserId) : false,
    })),
  }
}

async function setRecentConnectionFavorite(userId, targetUserId, favorite) {
  const user = await findUserById(userId)
  if (!user) {
    const error = new Error('用户不存在')
    error.status = 404
    throw error
  }

  const nextConnections = (user.recentConnections || []).map((item) =>
    item.targetUserId === targetUserId
      ? { ...item, favorite: Boolean(favorite) }
      : item,
  )

  const updated = await updateUser(userId, (current) => ({
    ...current,
    recentConnections: nextConnections,
  }))

  return getUserProfile(updated.id)
}

module.exports = {
  addRecentConnection,
  getUserProfile,
  loginUser,
  registerUser,
  setRecentConnectionFavorite,
}
