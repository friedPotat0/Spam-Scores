'use strict'
import { DEFAULT_SCORE_LOWER_BOUNDS, DEFAULT_SCORE_UPPER_BOUNDS, SCORE_REGEX } from './src/constants.js'

/**
 * Functions
 */

/**
 * dlh2: I sense that this function is supposed to get scores, but the code says the value of the regex.
 * @param {string} rawHeader Email Header
 * @returns {string|null} Regex Capture Value
 */
function getScore(rawHeader) {
  for (const key in SCORE_REGEX) {
    const data = rawHeader.match(SCORE_REGEX[key])
    if (!data) continue // If no match iterate
    return data[1]
  }
  return null
}

/**
 * Returns the path of the image
 * @param {string} score
 * @returns {string} Path of Image
 */
async function getImageSrc(score) {
  const storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const [lowerBounds, upperBounds] = getBounds(storage)
  if (score > upperBounds) return './images/score_positive.svg'
  if (score <= upperBounds && score >= lowerBounds) return './images/score_neutral.svg'
  if (score < lowerBounds) return './images/score_negative.svg'
  return './images/score_neutral.svg'
}

/**
 * Returns Lower & Upper Bound
 * @param {*} storage
 * @returns {number[]} Lower & Upper Bound
 */
function getBounds(storage) {
  const lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  )
  const upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  )
  return [lowerBounds, upperBounds]
}

/**
 * Main
 */
const init = async () => {
  browser.SpamScores.addWindowListener('none')
  browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    const rawMessage = await browser.messages.getRaw(message.id)
    const rawHeader = rawMessage.split('\r\n\r\n')[0]
    const score = getScore(rawHeader)
    if (score === null) {
      browser.messageDisplayAction.disable(tab.id)
    } else {
      browser.messageDisplayAction.enable(tab.id)
      browser.messageDisplayAction.setTitle({ tabId: tab.id, title: 'Spam Score: ' + score })
      browser.messageDisplayAction.setIcon({ path: await getImageSrc(score) })
    }

    if (SCORE_REGEX.mailscannerSpamcheck.test(rawHeader)) {
      const header = rawHeader.replace(/.*(x-.*?mailscanner-spamcheck):.*/is, '$1').toLowerCase()
      const storage = await browser.storage.local.get(['customMailscannerHeaders'])
      if (
        storage &&
        (!storage.customMailscannerHeaders ||
          (storage.customMailscannerHeaders && storage.customMailscannerHeaders.indexOf(header) === -1))
      ) {
        await browser.SpamScores.addDynamicCustomHeaders([header])
        browser.storage.local.set({
          customMailscannerHeaders: [...(storage.customMailscannerHeaders || []), header]
        })
      }
    }
  })

  if (!(await browser.SpamScores.getHelloFlag())) {
    messenger.windows.create({
      height: 680,
      width: 488,
      url: '/src/static/hello.html',
      type: 'popup'
    })
    browser.SpamScores.setHelloFlag()
  }

  const storage = await browser.storage.local.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'customMailscannerHeaders',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative'
  ])
  const [lowerBounds, upperBounds] = getBounds(storage)
  browser.SpamScores.setScoreBounds(lowerBounds, upperBounds)

  if (storage) {
    if (storage.customMailscannerHeaders) {
      browser.SpamScores.setCustomMailscannerHeaders(storage.customMailscannerHeaders)
    }
    browser.SpamScores.setHideIconScoreOptions(
      storage.hideIconScorePositive || false,
      storage.hideIconScoreNeutral || false,
      storage.hideIconScoreNegative || false
    )
  }
}
init()
