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
  HMAILSERVER_REASON_REGEX,
  SCORE_FAMILIES,
  SCORE_HEADER_FAMILY,
  IGNORED_DETAIL_RULES
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
 * @returns {{score: string, header: string}[]} Score value and the header it came from
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
        // A header can occur more than once (e.g. OVH adds one X-VR-SPAMSCORE per scan) - keep the highest
        let score = null
        for (const value of customHeaders[headerName]) {
          const scoreField = value.match(SCORE_REGEX[headerName])
          if (!scoreField) continue
          if (score === null || parseFloat(scoreField[1]) > parseFloat(score)) score = scoreField[1]
        }
        if (score === null) continue // If no match iterate
        scores.push({ score, header: headerName })
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
          scores.push({ score: scoreField[1], header: headerName })
        }
      }
    }
  }

  return scores
}

/**
 * @param {string} header
 * @returns {string} Family key the header belongs to
 */
export function getScoreFamily(header) {
  return SCORE_HEADER_FAMILY[header] || 'spamassassin'
}

/**
 * Display unit for a header's family, appended to the shown score (e.g. "%" for
 * probability scales). Empty string when the score is a plain number.
 * @param {string} header
 * @returns {string}
 */
export function scoreUnit(header) {
  return SCORE_FAMILIES[getScoreFamily(header)].unit || ''
}

/**
 * Resolves the lower & upper bounds for a family, using stored overrides or the
 * family default. Spamassassin keeps the original keys for backwards compatibility.
 * @param {Object<string, string>} storage
 * @param {string} familyKey
 * @returns {number[]} Lower & upper bounds
 */
export function getFamilyBounds(storage, familyKey) {
  const family = SCORE_FAMILIES[familyKey]
  const suffix = familyKey === 'spamassassin' ? '' : '_' + familyKey
  const lower = parseFloat(storage['scoreIconLowerBounds' + suffix] ?? family.defaultLowerBounds)
  const upper = parseFloat(storage['scoreIconUpperBounds' + suffix] ?? family.defaultUpperBounds)
  return [lower, upper]
}

/**
 * Classifies a raw score into 'positive' (spam), 'neutral' or 'negative' (ham)
 * on the scale of the header's family.
 * @param {string|number} score
 * @param {string} header
 * @param {Object<string, string>} storage
 * @returns {string}
 */
export function classifyScore(score, header, storage = {}) {
  const familyKey = getScoreFamily(header)
  const family = SCORE_FAMILIES[familyKey]
  if (family.mode === 'flag') return parseFloat(score) === 0 ? 'negative' : 'positive'
  const value = parseFloat(score)
  const [lower, upper] = getFamilyBounds(storage, familyKey)
  if (value > upper) return 'positive'
  if (value < lower) return 'negative'
  return 'neutral'
}

/**
 * Trims and removes double whitespaces
 * @param {string} result
 * @returns {string}
 */
export function sanitizeRegexResult(result) {
  return result?.trim()?.replace(/\s\s+/g, ' ')
}

/**
 * Decodes an OVH/Vade X-VR-SPAMCAUSE value. The value is obfuscated in character
 * pairs; each byte is the sum of a pair minus a fixed key and a nibble offset.
 * Rule names come out best-effort (a few characters can be off), the scores are exact.
 * @param {string} encoded
 * @returns {string}
 */
export function decodeSpamCause(encoded) {
  const clean = encoded.replace(/\s+/g, '')
  let out = ''
  for (let i = 0; i + 1 < clean.length; i += 2) {
    let offset = 0
    for (const c of 'cdefgh') {
      if (clean[i] === c || clean[i + 1] === c) {
        offset = (103 - c.charCodeAt(0)) * 16
        break
      }
    }
    out += String.fromCharCode(clean.charCodeAt(i) + clean.charCodeAt(i + 1) - 120 - offset)
  }
  return out
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

      // OVH/Vade stores the breakdown obfuscated in x-vr-spamcause. A mail can be
      // scanned more than once, so decode the cause of the highest-scoring scan to
      // match the score shown in the column and button.
      if (headerName === 'x-vr-spamcause') {
        const causes = headers['x-vr-spamcause']
        const causeScores = headers['x-vr-spamscore'] || []
        let index = 0
        let highest = -Infinity
        for (let i = 0; i < causeScores.length; i++) {
          const value = parseFloat(causeScores[i])
          if (!isNaN(value) && value > highest) {
            highest = value
            index = i
          }
        }
        const decoded = decodeSpamCause(causes[index] || causes[0])
        for (const match of decoded.matchAll(/\^?([A-Za-z][\w.-]*)\s*\((-?\d+)\)/g)) {
          parsedDetailScores.push({ name: match[1], score: parseFloat(match[2]), info: '', description: '' })
        }
        if (parsedDetailScores.length > 0) {
          break
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
      if (headerName === 'x-pmx-spam') {
        // Only the Report='...' part holds the rules; drop Gauge / Probability
        const report = headerValue.match(/Report='([\s\S]*)/)
        if (report) headerValue = report[1]
      }
      headerValue = headerValue.trim().replace(/\r?\n/g, ' ')
      let symbolMatch = headerValue.match(SYMBOL_REGEX.prefix)
      if (symbolMatch && symbolMatch.length > 0) {
        const detailScore = symbolMatch.map(el => ({
          name: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$2')),
          score: parseFloat(sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$1')) || 0),
          info: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$4')) || '',
          description: sanitizeRegexResult(el.replace(SYMBOL_REGEX.prefixSingle, '$3')) || ''
        })).filter(el => !IGNORED_DETAIL_RULES.includes(el.name))
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
        })).filter(el => !IGNORED_DETAIL_RULES.includes(el.name))
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
