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
  } else {
    messageButton.enable(idTab)
    messageButton.setTitle({ tabId: idTab, title: 'Spam Score: ' + score })
    messageButton.setIcon({ path: await getImageSrc(score) })
  }

  // Save custom header name for X-<MYCOMPANY>-MailScanner-SpamCheck headers
  for (const regExName in CUSTOM_SCORE_REGEX) {
    const headersFound = Object.entries(fullMessage.headers).filter(([key, value]) => key.endsWith(regExName))
    for (const headerFound of headersFound) {
      const headerName = headerFound[0] // header [Header Name, Header Value] - always lowercase
      const storage = await localStorage.get(['customMailscannerHeaders'])
      const customHeaders = storage.customMailscannerHeaders
      if (!customHeaders || (customHeaders && !customHeaders.includes(headerName))) {
        // Reason to restart Thunderbird & Repair Folder
        await messenger.SpamScores.addDynamicCustomHeaders([headerName])
        localStorage.set({ customMailscannerHeaders: [...(customHeaders || []), headerName] })
      }
    }
  }
}

/**
 * Fired when the displayed folder changes in any mail tab
 * @param {Tab} tab
 * @param {MailFolder} displayedFolder
 */
async function onDisplayedFolderChanged(tab, displayedFolder) {
  const spamScores = messenger.SpamScores
  // Disable addon on root folder
  if (displayedFolder.path !== '/') {
    const win = await messenger.windows.getCurrent()
    spamScores.repaint(win.id)
  } else {
    // Cleans in case we go to root
    spamScores.clear()
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
    messenger.windows.create({
      height: 680,
      width: 488,
      url: '/src/static/hello.html',
      type: 'popup'
    })
    localStorage.set({ hello: true })
  }

  // Add Listeners
  messenger.messageDisplay.onMessageDisplayed.addListener(onMessageDisplayed)
  messenger.mailTabs.onDisplayedFolderChanged.addListener(onDisplayedFolderChanged)

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
}
init()
