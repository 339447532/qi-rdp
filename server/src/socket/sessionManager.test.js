const test = require('node:test')
const assert = require('node:assert/strict')
const { createSessionManager } = require('./sessionManager')
const { SESSION_STATES } = require('./events')
const { ERROR_CODES } = require('./errors')

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  }
}

test('creates a waiting session for the controlled side', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const session = manager.createSession('controlled-1')

  assert.equal(session.controlledSocketId, 'controlled-1')
  assert.equal(session.status, SESSION_STATES.WAITING)
  assert.match(session.sessionCode, /^\d{6}$/)
})

test('marks session connecting immediately when controller joins with a valid passcode', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1')
  const joined = manager.joinSession(created.sessionCode, 'controller-1')

  assert.equal(joined.controllerSocketId, 'controller-1')
  assert.equal(joined.status, SESSION_STATES.CONNECTING)
})

test('requires valid passcode when joining protected session', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1', {
    passcode: { strategy: 'single', value: '654321' },
  })

  assert.throws(
    () => manager.joinSession(created.sessionCode, 'controller-1', { passcode: '000000' }),
    (error) => error.code === ERROR_CODES.INVALID_PASSCODE,
  )

  const joined = manager.joinSession(created.sessionCode, 'controller-1', { passcode: '654321' })
  assert.equal(joined.controllerSocketId, 'controller-1')
  assert.equal(joined.status, SESSION_STATES.CONNECTING)
})

test('blocks guest controller when session requires authentication', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1', {
    accessPolicy: { requireAuth: true },
    user: { id: 'owner-1', name: 'Owner' },
  })

  assert.throws(
    () => manager.joinSession(created.sessionCode, 'controller-1', {
      user: { name: '访客' },
    }),
    (error) => error.code === ERROR_CODES.AUTH_REQUIRED,
  )

  const joined = manager.joinSession(created.sessionCode, 'controller-2', {
    user: { id: 'member-1', name: 'Member' },
  })
  assert.equal(joined.controllerUser.id, 'member-1')
})

test('syncs user metadata onto active session', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1', {
    user: { id: 'u-controlled', name: '受控端' },
  })
  manager.joinSession(created.sessionCode, 'controller-1', {
    user: { id: 'u-controller', name: '主控端' },
  })

  const result = manager.syncUser('controller-1', { id: 'u-controller', name: 'Alice' })

  assert.equal(result.session.controllerUser.name, 'Alice')
})

test('rejects duplicate controller joins', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1')
  manager.joinSession(created.sessionCode, 'controller-1')

  assert.throws(() => manager.joinSession(created.sessionCode, 'controller-2'), {
    message: /当前会话已有主控端正在连接/,
  })
})

test('resets to waiting when controller leaves', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1')
  manager.joinSession(created.sessionCode, 'controller-1')

  const result = manager.leaveSession(created.sessionCode, 'controller-1')

  assert.equal(result.role, 'controller')
  assert.equal(result.session.status, SESSION_STATES.WAITING)
  assert.equal(result.session.controllerSocketId, null)
})

test('removes session when controlled side leaves', () => {
  const manager = createSessionManager({ logger: createLogger() })
  const created = manager.createSession('controlled-1')
  manager.joinSession(created.sessionCode, 'controller-1')

  const result = manager.leaveSession(created.sessionCode, 'controlled-1')

  assert.equal(result.role, 'controlled')
  assert.equal(manager.getSession(created.sessionCode), null)
})
