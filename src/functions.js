/**
 * Functions module.
 * @module functions
 */
import {
  DEFAULT_SCORE_LOWER_BOUNDS,
  DEFAULT_SCORE_UPPER_BOUNDS,
  SCORE_REGEX,
  CUSTOM_SCORE_REGEX,
  DEFAULT_SCORE_HEADER_ORDER
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
  const lowerBounds = parseFloat(storage.scoreIconLowerBounds ?? DEFAULT_SCORE_LOWER_BOUNDS)
  const upperBounds = parseFloat(storage.scoreIconUpperBounds ?? DEFAULT_SCORE_UPPER_BOUNDS)
  return [lowerBounds, upperBounds]
}

/**
 * @param {object} headers
 * @param {string[]} headerOrder - Custom order for parsing headers
 * @returns {string[]} Score value
 */
export function getScores(headers, headerOrder = null) {
  const scores = []
  // Get Custom Mail Headers
  const auxHeaders = Object.entries(headers).filter(([key, value]) => key.startsWith('x-'))
  // Remove Mozilla Headers
  const auxHeadersNoMozilla = auxHeaders.filter(([key, value]) => !key.startsWith('x-mozilla'))
  const customHeaders = Object.fromEntries(auxHeadersNoMozilla)

  // Use custom order if provided, otherwise use default order
  const scoreHeaders = headerOrder || DEFAULT_SCORE_HEADER_ORDER

  for (const headerName of scoreHeaders) {
    if (customHeaders[headerName]) {
      if (SCORE_REGEX[headerName]) {
        const scoreField = customHeaders[headerName][0].match(SCORE_REGEX[headerName])
        if (!scoreField) continue // If no match iterate
        // const score = scoreInterpolation(headerName, scoreField[1])
        const score = scoreField[1]
        scores.push(score)
      }
    }
  }

  // Check custom headers (e.g., mailscanner) if no score found yet
  if (scores.length === 0) {
    for (const headerName in customHeaders) {
      for (const regExName in CUSTOM_SCORE_REGEX) {
        if (headerName.endsWith(regExName)) {
          const scoreField = customHeaders[headerName][0].match(CUSTOM_SCORE_REGEX[regExName])
          if (!scoreField) continue // If no match iterate
          // const score = scoreInterpolation(headerName, scoreField[1])
          const score = scoreField[1]
          scores.push(score)
        }
      }
    }
  }

  return scores
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
