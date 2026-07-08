import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEml } from './lib/eml.js'
import { getScores } from '../src/functions.js'

const examples = join(dirname(fileURLToPath(import.meta.url)), 'mail-examples')

const expected = {
  'mailscanner-spamscore-1.eml': '-42.42',
  'rspamd-report-1.eml': '-42.42',
  'spam-report-1.eml': '-42.42',
  'spam-status-1.eml': '-42.42',
  'spam-status-2.eml': '-42.42',
  'spam-status-3.eml': '-42.42',
  'spam-status-4.eml': '-42.42',
  'spam-status-5.eml': '-42.42',
  'spam-status-6.eml': '-42.42',
  'spam-status-7.eml': '-42.42',
  'spam-status-8.eml': '-42.42',
  'spamd-result-1.eml': '-42.42',
  'vr-spamscore-1.eml': '420',
  'x-spam-result-1.eml': '-42.42'
}

test('each mail example resolves to its expected score', () => {
  for (const [file, score] of Object.entries(expected)) {
    const scores = getScores(parseEml(join(examples, file)))
    assert.equal(scores[0], score, file)
  }
})

test('every mail example is covered by an expectation', () => {
  const files = readdirSync(examples).filter(f => f.endsWith('.eml'))
  assert.deepEqual(files.sort(), Object.keys(expected).sort())
})

test('a custom header order changes which header wins', () => {
  const headers = parseEml(join(examples, 'spam-report-1.eml'))
  assert.equal(getScores(headers, ['x-spam-score', 'x-spam-status'])[0], '-4242')
})
