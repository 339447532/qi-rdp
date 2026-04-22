import { CONTROL_COMMANDS } from './protocol.js';

export const SYSTEM_COMMANDS = {
  SCREEN_INFO: 'system:screen-info',
  SESSION_OPTIONS: 'system:session-options',
};

/**
 * Encode a control command for DataChannel transmission
 */
export function encodeCommand(type, data) {
  return JSON.stringify({ type, ...data, ts: Date.now() });
}

/**
 * Decode a received DataChannel message
 */
export function decodeCommand(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Command builders
export const commands = {
  mouseMove: (x, y) => encodeCommand(CONTROL_COMMANDS.MOUSE_MOVE, { x, y }),
  mouseDown: (button = 0) => encodeCommand(CONTROL_COMMANDS.MOUSE_DOWN, { button }),
  mouseUp: (button = 0) => encodeCommand(CONTROL_COMMANDS.MOUSE_UP, { button }),
  mouseClick: (x, y, button = 0) => encodeCommand(CONTROL_COMMANDS.MOUSE_CLICK, { x, y, button }),
  mouseWheel: (deltaX = 0, deltaY) => encodeCommand(CONTROL_COMMANDS.MOUSE_WHEEL, { deltaX, deltaY }),
  keyboardDown: (key, code) => encodeCommand(CONTROL_COMMANDS.KEYBOARD_DOWN, { key, code }),
  keyboardUp: (key, code) => encodeCommand(CONTROL_COMMANDS.KEYBOARD_UP, { key, code }),
  keyboardTap: (key, code) => encodeCommand(CONTROL_COMMANDS.KEYBOARD_TAP, { key, code }),
  screenInfo: (display) => encodeCommand(SYSTEM_COMMANDS.SCREEN_INFO, { display }),
  sessionOptions: (options) => encodeCommand(SYSTEM_COMMANDS.SESSION_OPTIONS, { options }),
  clipboardSync: (text, sourceRole) => encodeCommand(CONTROL_COMMANDS.CLIPBOARD_SYNC, { text, sourceRole }),
  fileTransferMeta: (transferId, file) =>
    encodeCommand(CONTROL_COMMANDS.FILE_TRANSFER_META, { transferId, file }),
  fileTransferChunk: (transferId, chunk, index) =>
    encodeCommand(CONTROL_COMMANDS.FILE_TRANSFER_CHUNK, { transferId, chunk, index }),
  fileTransferComplete: (transferId, totalChunks) =>
    encodeCommand(CONTROL_COMMANDS.FILE_TRANSFER_COMPLETE, { transferId, totalChunks }),
};

// Special key mappings
export const SPECIAL_KEYS = {
  Enter: 'enter',
  Tab: 'tab',
  Escape: 'escape',
  Backspace: 'backspace',
  ArrowUp: 'arrow_up',
  ArrowDown: 'arrow_down',
  ArrowLeft: 'arrow_left',
  ArrowRight: 'arrow_right',
  Control: 'control',
  Shift: 'shift',
  Alt: 'alt',
  Meta: 'meta',
  CapsLock: 'capslock',
  Delete: 'delete',
  Home: 'home',
  End: 'end',
  PageUp: 'page_up',
  PageDown: 'page_down',
};

/**
 * Normalize key to robotjs-compatible format
 */
export function normalizeKey(key, code) {
  // Try special key mapping first
  if (SPECIAL_KEYS[key]) {
    return SPECIAL_KEYS[key];
  }

  // Single character keys
  if (key.length === 1) {
    return key.toLowerCase();
  }

  // Fallback to code
  if (code && code.startsWith('Key')) {
    return code.slice(3).toLowerCase();
  }

  if (code && code.startsWith('Digit')) {
    return code.slice(5);
  }

  return key.toLowerCase();
}
