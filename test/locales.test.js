import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const referenceLocale = 'en'

function messagesPath(locale) {
  return fileURLToPath(new URL(`../_locales/${locale}/messages.json`, import.meta.url))
}

function loadMessages(locale) {
  return JSON.parse(readFileSync(messagesPath(locale), 'utf8'))
}

const localesDir = fileURLToPath(new URL('../_locales', import.meta.url))
const locales = readdirSync(localesDir).filter(name => existsSync(messagesPath(name)))
const referenceKeys = Object.keys(loadMessages(referenceLocale))

test('the reference locale exists and has messages', () => {
  assert.ok(locales.includes(referenceLocale), `missing reference locale "${referenceLocale}"`)
  assert.ok(referenceKeys.length > 0, 'reference locale has no messages')
})

for (const locale of locales) {
  if (locale === referenceLocale) continue

  test(`locale "${locale}" has every ${referenceLocale} key`, () => {
    const keys = Object.keys(loadMessages(locale))
    const missing = referenceKeys.filter(key => !keys.includes(key))
    assert.deepEqual(missing, [], `missing keys: ${missing.join(', ')}`)
  })

  test(`locale "${locale}" has no keys beyond ${referenceLocale}`, () => {
    const keys = Object.keys(loadMessages(locale))
    const extra = keys.filter(key => !referenceKeys.includes(key))
    assert.deepEqual(extra, [], `unknown keys: ${extra.join(', ')}`)
  })

  test(`locale "${locale}" has a non-empty message for every key`, () => {
    const messages = loadMessages(locale)
    const empty = Object.keys(messages).filter(key => {
      const value = messages[key] && messages[key].message
      return typeof value !== 'string' || value.trim() === ''
    })
    assert.deepEqual(empty, [], `empty messages: ${empty.join(', ')}`)
  })
}
