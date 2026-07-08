import test from 'node:test'
import assert from 'node:assert/strict'
import { getBounds } from '../src/functions.js'

test('uses the stored bounds', () => {
  assert.deepEqual(getBounds({ scoreIconLowerBounds: -5, scoreIconUpperBounds: 5 }), [-5, 5])
})

test('keeps a bound set to 0', () => {
  assert.deepEqual(getBounds({ scoreIconLowerBounds: 0, scoreIconUpperBounds: 0 }), [0, 0])
})

test('falls back to the defaults when unset', () => {
  assert.deepEqual(getBounds({}), [-2, 2])
})

test('parses bounds stored as strings', () => {
  assert.deepEqual(getBounds({ scoreIconLowerBounds: '0', scoreIconUpperBounds: '3.5' }), [0, 3.5])
})
