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
      const allDetailScores = await getParsedDetailScores(fullMessage.headers)
      const parsedDetailScores = await deduplicateValues(allDetailScores)
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

        // Workaround for a bug where Thunderbird does not correctly calculate the popup window height in Wide View layout (see issue #33)
        document.querySelector('body').style.maxHeight = `${window.screen.height / 2 - 60}px`
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
 * Removes duplicate spam scores from the parsed details
 * @param {array} scores
 * @returns {array}
 */
async function deduplicateValues(scores) {
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
        if (scores[el].score > scores[el2].score ||
            scores[el].score < scores[el2].score) {
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
  const deduplicatedScores = scores.filter((el, index, self) =>
    self.findIndex(el2 =>
      (el.name === el2.name)
    ) === index
  )
  return deduplicatedScores
}

/**
 * Trims and removes double whitespaces
 * @param {string} result
 * @returns {string}
 */
function sanitizeRegexResult(result) {
  return result?.trim()?.replace(/\s\s+/g, ' ')
}
