/**
 * Functions module.
 * @module functions
 */
import {
  DEFAULT_SCORE_LOWER_BOUNDS,
  DEFAULT_SCORE_UPPER_BOUNDS,
  SCORE_REGEX,
  CUSTOM_SCORE_REGEX,
  DEFAULT_SCORE_HEADER_ORDER,
  SYMBOL_REGEX,
  HMAILSERVER_REASON_REGEX
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

/**
 * Trims and removes double whitespaces
 * @param {string} result
 * @returns {string}
 */
export function sanitizeRegexResult(result) {
  return result?.trim()?.replace(/\s\s+/g, ' ')
}

/**
 * Parse the score detail headers into individual symbol scores
 * @param {Object<string, string[]>} headers
 * @param {string[]} scoreDetailsOrder
 * @param {string[]} customHeaders
 * @returns {parsedDetailScores[]}
 */
export function parseDetailScores(headers, scoreDetailsOrder, customHeaders = []) {
  /** @type {parsedDetailScores[]} */
  let parsedDetailScores = []

  // Use custom order for score details headers
  const headersToCheck = [...scoreDetailsOrder, ...customHeaders.filter(h => !scoreDetailsOrder.includes(h))]

  for (const headerName of headersToCheck) {
    if (headers[headerName]) {
      // Special handling for x-hmailserver-reason-score
      if (headerName === 'x-hmailserver-reason-score') {
        // Parse hMailServer reason headers
        for (const hdrName in headers) {
          if (HMAILSERVER_REASON_REGEX.test(hdrName)) {
            const headerValue = headers[hdrName][0]
            // Format: "Description - (Score: X)"
            const match = headerValue.match(/^(.+?)\s*-\s*\(Score:\s*([-+]?[0-9]+\.?[0-9]*)\)/)
            if (match) {
              const description = match[1].trim()
              const score = parseFloat(match[2])
              // Create a simplified name from the description
              const name = hdrName.toUpperCase().replace('X-HMAILSERVER-REASON-', 'REASON_')
              parsedDetailScores.push({
                name: name,
                score: score,
                info: '',
                description: description
              })
            }
          }
        }
        if (parsedDetailScores.length > 0) {
          break // Found details, stop looking
        }
        continue
      }

      // Regular header parsing
      let headerValue = headers[headerName][0] // For some reason thunderbird always saves it as an array
      if (headerName === 'x-spam-report' || headerName === 'x-ham-report') {
        const reportSplitted = headerValue.split('Content analysis details:')
        if (reportSplitted.length > 1) {
          headerValue = reportSplitted[1]
        }
      }
      headerValue = headerValue.trim().replace(/\r?\n/g, ' ')
      let symbolMatch = headerValue.match(SYMBOL_REGEX.prefix)
      if (symbolMatch && symbolMatch.length > 0) {
        const detailScore = symbolMatch.map(el => ({
          name: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$2')),
          score: parseFloat(sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$1')) || 0),
          info: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$4')) || '',
          description: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$3')) || ''
        }))
        parsedDetailScores = [...parsedDetailScores, ...detailScore]
        // Use first matching header only (like for score headers)
        break
      }

      symbolMatch = headerValue.match(SYMBOL_REGEX.suffix)
      if (symbolMatch && symbolMatch.length > 0) {
        const detailScore = symbolMatch.map(el => ({
          name: sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$1')),
          score: parseFloat(sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$2')) || 0),
          info: sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$3')) || ''
        }))
        parsedDetailScores = [...parsedDetailScores, ...detailScore]
        // Use first matching header only (like for score headers)
        break
      }
    }
  }

  return parsedDetailScores
}

/**
 * Removes duplicate spam scores from the parsed details
 * @param {array} scores
 * @returns {array}
 */
export async function deduplicateValues(scores) {
  // Some spam filters (like spamassassin) do add two distinct headers
  // with similar information to an email:
  // X-Spam-Status and X-Spam-Report where the first only contains a
  // list of checks that match an email whereas the latter contains
  // the corresponding scores and description as well. This leads to
  // double reporting of spam scores with different scores because
  // the parsing routine uses 0 to provide scores for tests where it
  // cannot find them.
  // See also https://github.com/friedPotat0/Spam-Scores/issues/48
  // To get rid of these duplicates, we use a two step approach:
  // 1. For all checks with a score of 0 the array is being examined
  //    for another check of the same name that has a value being different
  //    to 0 that can be used to update the score. (We do also add
  //    descriptions provided by spamassassin in that step)
  // 2. Remove all duplicate checks from the array.
  // Unfortunately both passes do have a runtime of n^2.

  // 1. update all scores
  for (const el in scores) {
    for (const el2 in scores) {
      if (scores[el].name === scores[el2].name && scores[el2].score === 0) {
        if (scores[el].score > scores[el2].score || scores[el].score < scores[el2].score) {
          scores[el2].score = scores[el].score
        } else {
          scores[el].score = scores[el2].score
        }
        // while we're at it, update the description as well in
        // case it is missing
        if (!scores[el].description) {
          scores[el].description = scores[el2].description
        } else {
          scores[el2].description = scores[el].description
        }
      }
    }
  }
  // 2. remove duplicate checks -- https://stackoverflow.com/a/36744732
  const deduplicatedScores = scores.filter((el, index, self) => self.findIndex(el2 => el.name === el2.name) === index)
  return deduplicatedScores
}
