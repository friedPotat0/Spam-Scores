import test from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEml } from './lib/eml.js'
import { parseDetailScores, deduplicateValues } from '../src/functions.js'
import { DEFAULT_SCORE_DETAILS_ORDER } from '../src/constants.js'

const examples = join(dirname(fileURLToPath(import.meta.url)), 'mail-examples')

async function detailsByName(file) {
  const headers = parseEml(join(examples, file))
  const parsed = await deduplicateValues(parseDetailScores(headers, DEFAULT_SCORE_DETAILS_ORDER))
  return Object.fromEntries(parsed.map(d => [d.name, d.score + 0]))
}

const sentinel = {
  R_DKIM_ALLOW: -0.2,
  R_MIXED_CHARSET: 0.18,
  FREEMAIL_FROM: 0,
  DKIM_TRACE: 0,
  MX_GOOD: -0.01,
  BAYES_HAM: -5.5
}

for (const file of [
  'spamd-result-1.eml',
  'spam-status-1.eml',
  'spam-status-2.eml',
  'spam-status-4.eml',
  'spam-status-6.eml',
  'x-spam-result-1.eml'
]) {
  test(`${file} breaks down into the expected symbol scores`, async () => {
    assert.deepEqual(await detailsByName(file), sentinel)
  })
}

test('x-pmx-spam-1.eml breaks down the Report rules', async () => {
  assert.deepEqual(await detailsByName('x-pmx-spam-1.eml'), {
    CTYPE_JUST_HTML: 0.848,
    HTML_MIME_NO_HTML_TAG: 0.8,
    HTML_70_90: 0.1,
    MIME_LOWER_CASE: 0.05,
    BODYTEXTH_SIZE_10000_LESS: 0,
    URI_WITH_PATH: 0
  })
})

test('x-vr-spamcause-1.eml decodes the OVH breakdown (scores exact, names best-effort)', async () => {
  const headers = parseEml(join(examples, 'x-vr-spamcause-1.eml'))
  const details = await deduplicateValues(parseDetailScores(headers, DEFAULT_SCORE_DETAILS_ORDER))
  assert.deepEqual(
    details.map(d => d.score).sort((a, b) => a - b),
    [300, 500]
  )
  assert.ok(details.every(d => d.name.length > 0))
})

test('with several scans the breakdown belongs to the highest-scoring one', async () => {
  const headers = parseEml(join(examples, 'x-vr-spamcause-2.eml'))
  const details = await deduplicateValues(parseDetailScores(headers, DEFAULT_SCORE_DETAILS_ORDER))
  assert.deepEqual(
    details.map(d => d.score).sort((a, b) => a - b),
    [300, 500]
  )
})

test('x-spam-hits-1.eml breaks down Fastmail rules without the informational tokens', async () => {
  assert.deepEqual(await detailsByName('x-spam-hits-1.eml'), {
    DCC_REPUT_00_12: -0.8,
    HTML_IMAGE_ONLY_28: 0.726,
    HTML_MESSAGE: 0.001,
    ME_SENDERREP_NEUTRAL: 0.001,
    MIME_HTML_ONLY: 0.1,
    RCVD_IN_MSPIKE_H2: -0.001,
    SPF_HELO_NONE: 0.001,
    SPF_PASS: -0.001,
    T_SCC_BODY_TEXT_LINE: -0.01,
    UNPARSEABLE_RELAY: 0.001
  })
})
