import { SCORE_SYMBOLS } from './score_symbols.js'
import { DEFAULT_SCORE_DETAILS_ORDER } from '../../constants.js'
import { parseDetailScores, deduplicateValues } from '../../functions.js'

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
 * @param {Object<string, string[]>} headers
 * @returns {parsedDetailScores[]}
 */
async function getParsedDetailScores(headers) {
  const storage = await messenger.storage.local.get(['customMailscannerHeaders', 'scoreDetailsHeaderOrder'])
  const customHeaders = storage.customMailscannerHeaders || []
  const scoreDetailsOrder = storage.scoreDetailsHeaderOrder || DEFAULT_SCORE_DETAILS_ORDER
  return parseDetailScores(headers, scoreDetailsOrder, customHeaders)
}
