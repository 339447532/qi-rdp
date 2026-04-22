function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateUniqueCode(existingCodes, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateCode()
    if (!existingCodes.has(code)) {
      return code
    }
  }

  throw new Error('Unable to generate unique session code')
}

module.exports = {
  generateUniqueCode,
}
