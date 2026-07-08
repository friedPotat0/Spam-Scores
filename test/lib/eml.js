import { readFileSync } from 'node:fs'

// Parses an .eml file into the header shape Thunderbird's messages.getFull()
// returns: lowercased header names mapped to an array of values, folded
// continuation lines kept as-is (joined with a newline).
export function parseEml(path) {
  const text = readFileSync(path, 'utf8')
  const headers = {}
  let current = null

  for (const line of text.split(/\r?\n/)) {
    if (line === '') break
    if (/^[ \t]/.test(line) && current) {
      const values = headers[current]
      values[values.length - 1] += '\n' + line
      continue
    }
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const name = line.slice(0, idx).trim().toLowerCase()
    let value = line.slice(idx + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (!headers[name]) headers[name] = []
    headers[name].push(value)
    current = name
  }

  return headers
}
