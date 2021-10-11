'use strict'
import { SCORE_ARRAY, SCORE_REGEX, CUSTOM_SCORE_REGEX } from '../constants.js'
import { getBounds } from '../functions.js'

const localStorage = browser.storage.local

/**
 * Functions
 */

/**
 * [dlh2] TODO: How we should deal with multiple scores?
 * We can treat them as just scores then making an average or retrieving every score
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
  for (const headerName in customHeaders) {
    if (SCORE_ARRAY.includes(headerName)) {
      // dlh2: There's gotta be simpler code for this ~_~
      const score = customHeaders[headerName][0].match(SCORE_REGEX[headerName])[1]
      scores.push(score)
    } else {
      for (const regExName in CUSTOM_SCORE_REGEX) {
        if (headerName.endsWith(regExName)) {
          const score = customHeaders[headerName][0].match(CUSTOM_SCORE_REGEX[regExName])
          if (!score) continue // If no match iterate
          scores.push(score[1])
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
  else if (score <= upperBounds && score >= lowerBounds) return '/images/score_neutral.svg'
  else if (score < lowerBounds) return '/images/score_negative.svg'
  else return '/images/score_neutral.svg'
}

/**
 * Executed everytime a message is displayed
 * @param {Tab} tab
 * @param {MessageHeader} message
 */
async function onMessageDisplayed(tab, message) {
  // Declaration / Values
  const idTab = tab.id
  const fullMessage = await browser.messages.getFull(message.id)
  const messageButton = browser.messageDisplayAction

  // Get Score
  const scores = getScores(fullMessage.headers) // Get Scores
  const score = isNaN(scores[0]) ? null : scores[0] // THIS CODE IS BAD, deciding on next commit

  // Message Score Button
  if (score === null) {
    messageButton.disable(idTab)
  } else {
    messageButton.enable(idTab)
    messageButton.setTitle({ tabId: idTab, title: 'Spam Score: ' + score })
    messageButton.setIcon({ path: await getImageSrc(score) })
  }

  // Save Custom Name Header for... something of the Dynamic custom headers. dlh2 TODO: I'll try to understand it later.
  for (const regExName in CUSTOM_SCORE_REGEX) {
    const headersFound = Object.entries(fullMessage.headers).filter(([key, value]) => key.endsWith(regExName))
    // I think we need to deal it in another way, it could be that there's other emails that could end the same way.
    for (const headerFound of headersFound) {
      const headerName = headerFound[0] // header [Header Name, Header Value]
      // Note: The header is always lowercase in messages.getFull
      const storage = await localStorage.get(['customMailscannerHeaders'])
      if (
        storage &&
        (!storage.customMailscannerHeaders ||
          (storage.customMailscannerHeaders && storage.customMailscannerHeaders.indexOf(headerName) === -1))
      ) {
        await browser.SpamScores.addDynamicCustomHeaders([header])
        localStorage.set({
          customMailscannerHeaders: [...(storage.customMailscannerHeaders || []), headerName]
        })
      }
    }
  }
}

/**
 * Main
 */
const init = async () => {
  // Declaration / Values
  const spamScores = browser.SpamScores
  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'customMailscannerHeaders',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative'
  ])

  // Hello Message
  if (!(await spamScores.getHelloFlag())) {
    messenger.windows.create({
      height: 680,
      width: 488,
      url: '/src/static/hello.html',
      type: 'popup'
    })
    spamScores.setHelloFlag()
  }

  // Add Listeners
  spamScores.addWindowListener('none')
  browser.messageDisplay.onMessageDisplayed.addListener(onMessageDisplayed)

  // Init Data
  const [lowerBounds, upperBounds] = getBounds(storage)
  spamScores.setScoreBounds(lowerBounds, upperBounds)

  if (storage) {
    if (storage.customMailscannerHeaders) {
      spamScores.setCustomMailscannerHeaders(storage.customMailscannerHeaders)
    }
    spamScores.setHideIconScoreOptions(
      storage.hideIconScorePositive || false,
      storage.hideIconScoreNeutral || false,
      storage.hideIconScoreNegative || false
    )
  }
}
init()
