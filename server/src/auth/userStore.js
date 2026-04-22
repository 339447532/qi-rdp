const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { USER_STORE_PATH } = require('./config')

async function ensureStore() {
  await fs.mkdir(path.dirname(USER_STORE_PATH), { recursive: true })
  try {
    await fs.access(USER_STORE_PATH)
  } catch {
    await fs.writeFile(USER_STORE_PATH, '[]', 'utf8')
  }
}

async function readUsers() {
  await ensureStore()
  const content = await fs.readFile(USER_STORE_PATH, 'utf8')
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : []
}

async function writeUsers(users) {
  await ensureStore()
  await fs.writeFile(USER_STORE_PATH, JSON.stringify(users, null, 2), 'utf8')
}

async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  const users = await readUsers()
  return users.find((user) => user.email === normalized) || null
}

async function findUserById(userId) {
  const users = await readUsers()
  return users.find((user) => user.id === userId) || null
}

async function createUser({ name, email, passwordHash }) {
  const users = await readUsers()
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (users.some((user) => user.email === normalizedEmail)) {
    const error = new Error('该邮箱已注册')
    error.code = 'USER_EXISTS'
    throw error
  }

  const user = {
    id: randomUUID(),
    name: String(name || '').trim() || '未命名用户',
    email: normalizedEmail,
    passwordHash,
    recentConnections: [],
    createdAt: new Date().toISOString(),
  }

  users.push(user)
  await writeUsers(users)
  return user
}

async function updateUser(userId, updater) {
  const users = await readUsers()
  const index = users.findIndex((user) => user.id === userId)

  if (index === -1) {
    return null
  }

  const nextUser = updater(users[index])
  users[index] = nextUser
  await writeUsers(users)
  return nextUser
}

async function addRecentConnection(userId, connection) {
  return updateUser(userId, (user) => {
    const withoutDuplicate = (user.recentConnections || []).filter(
      (item) => item.targetUserId !== connection.targetUserId,
    )

    return {
      ...user,
      recentConnections: [
        {
          ...connection,
          lastConnectedAt: new Date().toISOString(),
        },
        ...withoutDuplicate,
      ].slice(0, 8),
    }
  })
}

module.exports = {
  addRecentConnection,
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
}
