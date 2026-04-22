const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')

test('registers and logs in a user against the JSON store', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qi-rdp-auth-'))
  process.env.USER_STORE_PATH = path.join(tempDir, 'users.json')
  process.env.AUTH_SECRET = 'test-secret'

  delete require.cache[require.resolve('./config')]
  delete require.cache[require.resolve('./userStore')]
  delete require.cache[require.resolve('./token')]
  delete require.cache[require.resolve('./service')]

  const { registerUser, loginUser, getUserProfile, addRecentConnection } = require('./service')

  const registered = await registerUser({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'secret123',
  })

  assert.equal(registered.user.name, 'Alice')
  assert.equal(registered.user.email, 'alice@example.com')
  assert.ok(registered.token)

  const loggedIn = await loginUser({
    email: 'alice@example.com',
    password: 'secret123',
  })

  assert.equal(loggedIn.user.email, 'alice@example.com')

  const profile = await getUserProfile(loggedIn.user.id)
  assert.equal(profile.name, 'Alice')

  await addRecentConnection(loggedIn.user.id, {
    code: '123456',
    targetUserId: 'target-1',
    targetName: 'Bob',
    targetEmail: 'bob@example.com',
    requireAuth: true,
  })

  const updatedProfile = await getUserProfile(loggedIn.user.id)
  assert.equal(updatedProfile.recentConnections.length, 1)
  assert.equal(updatedProfile.recentConnections[0].targetName, 'Bob')
})
