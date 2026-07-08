import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyScore, getFamilyBounds, getScoreFamily } from '../src/functions.js'

test('spamassassin uses the default bounds', () => {
  assert.equal(classifyScore('5', 'x-spam-status'), 'positive')
  assert.equal(classifyScore('-5', 'x-spam-status'), 'negative')
  assert.equal(classifyScore('0', 'x-spam-status'), 'neutral')
})

test('vade classifies on its own scale', () => {
  assert.equal(classifyScore('607', 'x-vr-spamscore'), 'positive')
  assert.equal(classifyScore('20', 'x-vr-spamscore'), 'negative')
  assert.equal(classifyScore('150', 'x-vr-spamscore'), 'neutral')
})

test('pmx classifies a probability', () => {
  assert.equal(classifyScore('60', 'x-pmx-spam'), 'positive')
  assert.equal(classifyScore('16', 'x-pmx-spam'), 'negative')
  assert.equal(classifyScore('30', 'x-pmx-spam'), 'neutral')
})

test('gmx treats a non-zero reason code as spam', () => {
  assert.equal(classifyScore('0', 'x-gmx-antispam'), 'negative')
  assert.equal(classifyScore('6', 'x-gmx-antispam'), 'positive')
})

test('unknown headers fall back to spamassassin', () => {
  assert.equal(getScoreFamily('x-my-mailscanner-spamcheck'), 'spamassassin')
})

test('stored overrides replace the family default', () => {
  assert.deepEqual(getFamilyBounds({ scoreIconLowerBounds_pmx: '40', scoreIconUpperBounds_pmx: '70' }, 'pmx'), [40, 70])
  assert.deepEqual(getFamilyBounds({}, 'pmx'), [20, 50])
  assert.deepEqual(getFamilyBounds({ scoreIconLowerBounds: '-3', scoreIconUpperBounds: '4' }, 'spamassassin'), [-3, 4])
})
