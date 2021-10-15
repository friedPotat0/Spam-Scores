/**
 * Functions module.
 * @module functions
 */
import {
  DEFAULT_SCORE_LOWER_BOUNDS,
  DEFAULT_SCORE_UPPER_BOUNDS,
  MAX_SCORE_SEEN,
  MIN_SCORE_SEEN,
  SCORE_INTERPOLATION
} from './constants.js'

/**
 * Returns Lower & Upper Bound
 * @param {*} storage Local storage with Lower & Upper bounds
 * @returns {number[]} Lower & Upper Bound
 */
export function getBounds(storage) {
  const lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  )
  const upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  )
  return [lowerBounds, upperBounds]
}

/**
 * 
 * @param {string} headername 
 * @param {string} score 
 * @returns {string} Interpolated Score | Score
 */
export function scoreInterpolation(headername, score) {
  const scoreType = SCORE_INTERPOLATION[headername]
  if (scoreType) {
    let numerator = 1
    let denominator = 1
    if (score > scoreType.MAX_UPPER_BOUNDS) {
      numerator = MAX_SCORE_SEEN - DEFAULT_SCORE_UPPER_BOUNDS
      denominator = scoreType.MAX_VALUE - scoreType.UPPER_BOUNDS
    } else if (score < scoreType.MIN_LOWER_BOUNDS) {
      numerator = MIN_SCORE_SEEN - DEFAULT_SCORE_LOWER_BOUNDS
      denominator = scoreType.MIN_VALUE - scoreType.LOWER_BOUNDS
    } else {
      numerator = DEFAULT_SCORE_UPPER_BOUNDS - DEFAULT_SCORE_LOWER_BOUNDS
      denominator = scoreType.UPPER_BOUNDS - scoreType.LOWER_BOUNDS
    }
    const scale = numerator / denominator
    score *= scale
  }
  return score
}

/**
 * dlh2 my brain hurts
 * Source: https://gist.github.com/DoubleYouEl/e3de97293ce3d5452b3be7a336a06ad7
 * Another: https://gist.github.com/leucos/5a44b2ba5c85f6591a39147d618ce104
 * @param {*} msg
 * @returns
 */
export function decodeVRCause(msg) {
  const arrayMsg = [...msg]
  text = []
  // Here we just sent
  for (let i = 0, j = true; i < arrayMsg.length; i = i + 2, j = !j) {
    text.push(decodeVRPair(arrayMsg[i] + arrayMsg[i + 1], j))
  }
  return text.join('')
}

const vrConst = 'g'.charCodeAt(0)
/**
 *
 * @param {*} pair
 * @param {*} oddOrEven
 * @param {*} key
 * @returns
 */
function decodeVRPair(pair, oddOrEven, key = 'x'.charCodeAt(0)) {
  if (oddOrEven) pair = pair[1] + pair[0]
  let offset = 0
  for (const c of [...'cdefgh']) {
    if (pair.includes(c)) {
      offset = (vrConst - c.charCodeAt(0)) * 16
      break
    }
  }
  let math_thing = 0
  for (const character of pair) {
    math_thing += character.charCodeAt(0)
  }
  const unicode = math_thing - key - offset
  return String.fromCharCode(unicode)
}
