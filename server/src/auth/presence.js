const connectedUsers = new Map()

function markUserOnline(userId) {
  if (!userId) return
  connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1)
}

function markUserOffline(userId) {
  if (!userId) return
  const nextCount = (connectedUsers.get(userId) || 0) - 1
  if (nextCount <= 0) {
    connectedUsers.delete(userId)
    return
  }

  connectedUsers.set(userId, nextCount)
}

function isUserOnline(userId) {
  return connectedUsers.has(userId)
}

module.exports = {
  isUserOnline,
  markUserOffline,
  markUserOnline,
}
