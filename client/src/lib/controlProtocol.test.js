import test from 'node:test'
import assert from 'node:assert/strict'
import { commands, decodeCommand, SYSTEM_COMMANDS } from './controlProtocol.js'
import { CONTROL_COMMANDS } from './protocol.js'

test('encodes and decodes mouse move commands', () => {
  const raw = commands.mouseMove(0.25, 0.75)
  const payload = decodeCommand(raw)

  assert.equal(payload.type, CONTROL_COMMANDS.MOUSE_MOVE)
  assert.equal(payload.x, 0.25)
  assert.equal(payload.y, 0.75)
  assert.equal(typeof payload.ts, 'number')
})

test('encodes screen metadata messages', () => {
  const raw = commands.screenInfo({ id: 'screen-1', bounds: { width: 1920, height: 1080 } })
  const payload = decodeCommand(raw)

  assert.equal(payload.type, SYSTEM_COMMANDS.SCREEN_INFO)
  assert.equal(payload.display.id, 'screen-1')
  assert.equal(payload.display.bounds.width, 1920)
})

test('encodes clipboard sync messages', () => {
  const raw = commands.clipboardSync('hello', 'controller')
  const payload = decodeCommand(raw)

  assert.equal(payload.type, CONTROL_COMMANDS.CLIPBOARD_SYNC)
  assert.equal(payload.text, 'hello')
  assert.equal(payload.sourceRole, 'controller')
})
