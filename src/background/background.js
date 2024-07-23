'use strict'
import { SCORE_REGEX, CUSTOM_SCORE_REGEX } from '../constants.js'
import { getBounds /* , scoreInterpolation */ } from '../functions.js'

/**
 * @type {StorageArea}
 */
const localStorage = messenger.storage.local

/**
 * Functions
 */

/**
 * @param {object} headers
 * @returns {string[]} Score value
 */
function getScores(headers) {
  const scores = []
  // Get Custom Mail Headers
  const auxHeaders = Object.entries(headers).filter(([key, value]) => key.startsWith('x-'))
  // Remove Mozilla Headers
  const auxHeadersNoMozilla = auxHeaders.filter(([key, value]) => !key.startsWith('x-mozilla'))
  const customHeaders = Object.fromEntries(auxHeadersNoMozilla)
  const scoreHeaders = Object.keys(SCORE_REGEX)
  for (const headerName in customHeaders) {
    if (scoreHeaders.includes(headerName)) {
      const scoreField = customHeaders[headerName][0].match(SCORE_REGEX[headerName])
      if (!scoreField) continue // If no match iterate
      // const score = scoreInterpolation(headerName, scoreField[1])
      const score = scoreField[1]
      scores.push(score)
    } else {
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

/**
 * Returns the path of the image
 * @param {string} score
 * @returns {string} Path of Image
 */
async function getImageSrc(score) {
  if (score === null) return '/images/score_no.svg'
  const storage = await localStorage.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const [lowerBounds, upperBounds] = getBounds(storage)
  if (score > upperBounds) return '/images/score_positive.svg'
  if (score <= upperBounds && score >= lowerBounds) return '/images/score_neutral.svg'
  if (score < lowerBounds) return '/images/score_negative.svg'
  return '/images/score_neutral.svg'
}

/**
 * Executed everytime a message is displayed
 * @param {Tab} tab
 * @param {MessageHeader} message
 */
async function onMessageDisplayed(tab, message) {
  // Declaration / Values
  const idTab = tab.id
  const fullMessage = await messenger.messages.getFull(message.id)
  const messageButton = messenger.messageDisplayAction

  // Get Score
  const scores = getScores(fullMessage.headers) // Get Scores
  const score = isNaN(scores[0]) ? null : scores[0]

  // Message Score Button
  if (score === null) {
    messageButton.disable(idTab)
    messageButton.setTitle({ tabId: idTab, title: 'No Spam Score' })
    messageButton.setIcon({ path: await getImageSrc(null) })
  } else {
    messageButton.enable(idTab)
    messageButton.setTitle({ tabId: idTab, title: 'Spam Score: ' + score })
    messageButton.setIcon({ path: await getImageSrc(score) })
  }

  /**
   * Save static (e.g. x-spam-score, x-rspamd-score) and dynamic (X-<MYCOMPANY>-MailScanner-SpamCheck) header names
   * in global preferences to be stored by Thunderbird for each mail
   *
   * Reason to restart Thunderbird & repair folders
   */
  const dynamicHeaders = []
  let dynamicHeaderFound = false
  for (const dynamicHeaderSuffix in CUSTOM_SCORE_REGEX) {
    const fullDynamicHeaderName = Object.keys(fullMessage.headers).find(key => key.endsWith(dynamicHeaderSuffix))
    if (fullDynamicHeaderName) {
      dynamicHeaders.push(fullDynamicHeaderName)
      dynamicHeaderFound = true
    }
  }
  // Static header names will be automatically added
  await messenger.SpamScores.addHeadersToPrefs(dynamicHeaders)
  // Store new dynamic header names in localStorage to be recognised by the score column
  if (dynamicHeaderFound) {
    const storage = await localStorage.get(['customMailscannerHeaders'])
    let customMailscannerHeaders = storage.customMailscannerHeaders || []
    for (const header of dynamicHeaders) {
      if (!customMailscannerHeaders.includes(header)) {
        customMailscannerHeaders.push(header)
      }
    }
    localStorage.set({ customMailscannerHeaders })
  }
}

/**
 * Main
 */
const init = async () => {
  // Declaration / Values
  const spamScores = messenger.SpamScores
  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'customMailscannerHeaders',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative',
    'hello'
  ])

  // Hello Message
  if (!storage.hello) {
    /**
     * Additional condition deprecated (Fallback for add-on version <= 1.3.1)
     * Prevents displaying the message on subsequent installations.
     * Should be removed when majority has updated!
     */
    if (!(await spamScores.getHelloFlag())) {
      messenger.windows.create({
        height: 680,
        width: 488,
        url: '/src/static/hello.html',
        type: 'popup'
      })
    }
    localStorage.set({ hello: true })
  }

  // Add Listeners
  messenger.messageDisplay.onMessageDisplayed.addListener(onMessageDisplayed)

  // Init Data
  const [lowerBounds, upperBounds] = getBounds(storage)
  spamScores.setScoreBounds(lowerBounds, upperBounds)

  if (storage.customMailscannerHeaders) {
    spamScores.setCustomMailscannerHeaders(storage.customMailscannerHeaders)
  }
  spamScores.setHideIconScoreOptions(
    storage.hideIconScorePositive || false,
    storage.hideIconScoreNeutral || false,
    storage.hideIconScoreNegative || false
  )
  spamScores.addColumns("SpamScore", "SpamScore (Icon)");
}
init()
