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
        let scoreDetailTable = document.querySelector('table#score-details')
        scoreDetailTable.style.display = 'block'
        const rowTemplate = document.querySelector('template#score-detail-row')

        for (const groupType of ['positive', 'negative', 'neutral']) {
          for (const detailElement of groupedDetailScores[groupType]) {
            // Get symbol description
            const symbolDescription = SCORE_SYMBOLS.find(sym => sym.name === detailElement.name)?.description

            // Clone template row
            let detailRow = document.importNode(rowTemplate.content, true)

            // Fill in data
            detailRow.querySelector('.score-detail-row').classList.add(groupType)
            detailRow.querySelector('.score').textContent = detailElement.score
            detailRow.querySelector('.name').textContent = detailElement.name || '-'
            if (symbolDescription) {
              detailRow.querySelector('.description').textContent = symbolDescription
            } else {
              detailRow.querySelector('.description').textContent = detailElement.description
            }
            if (detailElement.info) {
              detailRow.querySelector('.info').textContent = `[${detailElement.info}]`
            }

            // Add row to table
            scoreDetailTable.append(detailRow)
          }
        }
      } else {
        document.querySelector('#no-details').style.display = 'block'
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
      if (headerName === 'x-spam-report') {
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
 * Trims and removes double whitespaces
 * @param {string} result
 * @returns {string}
 */
function sanitizeRegexResult(result) {
  return result?.trim()?.replace(/\s\s+/g, ' ')
}
