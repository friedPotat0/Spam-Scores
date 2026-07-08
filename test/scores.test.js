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
  'vr-spamscore-2.eml': '607',
  'x-spam-result-1.eml': '-42.42',
  'x-pmx-spam-1.eml': '16',
  'x-gmx-antispam-1.eml': '6',
  'x-vr-spamcause-1.eml': '800',
  'x-vr-spamcause-2.eml': '800',
  'x-spam-hits-1.eml': '0.0'
}

test('each mail example resolves to its expected score', () => {
  for (const [file, score] of Object.entries(expected)) {
    const scores = getScores(parseEml(join(examples, file)))
    assert.equal(scores[0].score, score, file)
  }
})

test('every mail example is covered by an expectation', () => {
  const files = readdirSync(examples).filter(f => f.endsWith('.eml'))
  assert.deepEqual(files.sort(), Object.keys(expected).sort())
})

test('a custom header order changes which header wins', () => {
  const headers = parseEml(join(examples, 'spam-report-1.eml'))
  assert.equal(getScores(headers, ['x-spam-score', 'x-spam-status'])[0].score, '-4242')
})

test('the highest score wins when a header appears more than once', () => {
  const headers = parseEml(join(examples, 'vr-spamscore-2.eml'))
  assert.equal(getScores(headers)[0].score, '607')
})
