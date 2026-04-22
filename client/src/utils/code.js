export function formatCode(code) {
  if (!code) return ''
  return code.replace(/(\d{3})(?=\d)/g, '$1 ')
}

export function unformatCode(formatted) {
  return formatted.replace(/\s/g, '')
}
