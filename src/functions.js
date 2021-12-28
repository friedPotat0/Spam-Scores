/**
 * Functions module.
 * @module functions
 */
import {
  DEFAULT_SCORE_LOWER_BOUNDS,
  DEFAULT_SCORE_UPPER_BOUNDS
  // MAX_SCORE_SEEN,
  // MIN_SCORE_SEEN,
  // SCORE_INTERPOLATION
} from './constants.js'

/**
 * Returns lower & upper bounds
 * @param {Object<string, string>} storage Local storage with lower & upper bounds
 * @returns {number[]} Lower & upper bounds
 */
export function getBounds(storage) {
  const lowerBounds = parseFloat(storage.scoreIconLowerBounds || DEFAULT_SCORE_LOWER_BOUNDS)
  const upperBounds = parseFloat(storage.scoreIconUpperBounds || DEFAULT_SCORE_UPPER_BOUNDS)
  return [lowerBounds, upperBounds]
}

// /**
//  *
//  * @param {string} headername
//  * @param {string} score
//  * @returns {string} Interpolated score or the raw score
//  */
// export function scoreInterpolation(headername, score) {
//   const scoreType = SCORE_INTERPOLATION[headername]
//   if (scoreType) {
//     let numerator = 1
//     let denominator = 1
//     if (score > scoreType.MAX_UPPER_BOUNDS) {
//       numerator = MAX_SCORE_SEEN - DEFAULT_SCORE_UPPER_BOUNDS
//       denominator = scoreType.MAX_VALUE - scoreType.UPPER_BOUNDS
//     } else if (score < scoreType.MIN_LOWER_BOUNDS) {
//       numerator = MIN_SCORE_SEEN - DEFAULT_SCORE_LOWER_BOUNDS
//       denominator = scoreType.MIN_VALUE - scoreType.LOWER_BOUNDS
//     } else {
//       numerator = DEFAULT_SCORE_UPPER_BOUNDS - DEFAULT_SCORE_LOWER_BOUNDS
//       denominator = scoreType.UPPER_BOUNDS - scoreType.LOWER_BOUNDS
//     }
//     const scale = numerator / denominator
//     score *= scale
//   }
//   return score
// }
