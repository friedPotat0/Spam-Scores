import { SCORE_SYMBOLS } from './score_symbols.js'
import { SCORE_DETAILS_ARRAY, SYMBOL_REGEX } from '../../constants.js'

messenger.tabs
  .query({
    active: true,
    currentWindow: true
  })
  .then(async tabs => {
    // Declaration / Values
    const tabId = tabs[0].id
    messenger.messageDisplay.getDisplayedMessage(tabId).then(async message => {
      const fullMessage = await messenger.messages.getFull(message.id)
      const parsedDetailScores = await getParsedDetailScores(fullMessage.headers)
      if (parsedDetailScores.length !== 0) {
        const groupedDetailScores = {
          positive: parsedDetailScores.filter(el => el.score > 0).sort((a, b) => b.score - a.score),
          negative: parsedDetailScores.filter(el => el.score < 0).sort((a, b) => a.score - b.score),
          neutral: parsedDetailScores.filter(el => el.score === 0).sort((a, b) => a.name.localeCompare(b.name))
        }
        let scoreDetailElements =
          '<table class="score-details"><tr><th>Score</th><th>Name</th><th>Description</th></tr>'
        for (const groupType of ['positive', 'negative', 'neutral']) {
          scoreDetailElements += groupedDetailScores[groupType]
            .map(el => {
              const symbol = SCORE_SYMBOLS.find(sym => sym.name === el.name)
              let element = '<tr class="score ' + groupType + '">'
              element += '<td><span>' + el.score + '</span></td>'
              element += '<td><span>' + (el.name || '-') + '</span></td>' + '<td><span>'
              if (symbol || el.description) {
                element += symbol ? symbol.description : el.description
                if (el.info) element += ' <div class="info">[' + el.info + ']</div>'
              }
              element += '</span></td>' + '</tr>'
              return element
            })
            .join('')
        }
        scoreDetailElements += '</table>'
        document.body.innerHTML = scoreDetailElements
      } else {
        document.body.innerHTML = '<h5>No details available</h5>'
      }
    })
  })

/**
 * Parse the headers
 * @param {Object<string, string[]} headers
 * @returns {parsedDetailScores[]}
 */
async function getParsedDetailScores(headers) {
  const storage = await messenger.storage.local.get(['customMailscannerHeaders'])
  const customHeaders = Object.values(storage).map(value => value[0])
  /** @type {parsedDetailScores[]} */
  let parsedDetailScores = []
  for (const headerName in headers) {
    if (SCORE_DETAILS_ARRAY.includes(headerName) || customHeaders.includes(headerName)) {
      let headerValue = headers[headerName][0] // For some reason thunderbird always saves it as an array
      // We might use directly switch case instead of checking if the header is there
      if (headerName === 'x-spam-report') {
        /**
         * dlh2 TODO: Okay #34 problem is here, we have a lot of ways to deal with it,
         * but you know, we can't split with \n as somehow the email is translated to
         * some whitespaces therefore this gotta be interesting.
         */
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
        continue
      }

      symbolMatch = headerValue.match(SYMBOL_REGEX.suffix)
      if (symbolMatch && symbolMatch.length > 0) {
        const detailScore = symbolMatch.map(el => ({
          name: sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$1')),
          score: parseFloat(sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$2')) || 0),
          info: sanitizeRegexResult(el.replace(SYMBOL_REGEX.suffix, '$3')) || ''
        }))
        parsedDetailScores = [...parsedDetailScores, ...detailScore]
        continue
      }
    }
  }
  return parsedDetailScores
}

/**
 * Trims then replaces Groups of Doubles whitespaces to one whitespace
 * @param {string} result
 * @returns {string}
 */
function sanitizeRegexResult(result) {
  return result?.trim()?.replace(/\s\s+/g, ' ')
}
