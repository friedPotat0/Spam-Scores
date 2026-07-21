'use strict'
import { CUSTOM_SCORE_REGEX, DEFAULT_SCORE_HEADER_ORDER, SCORE_FAMILIES } from '../constants.js'
import { getScores, classifyScore, getFamilyBounds, scoreUnit } from '../functions.js'

/**
 * @type {StorageArea}
 */
const localStorage = messenger.storage.local
const i18n = messenger.i18n

/**
 * Functions
 */

/**
 * Returns the path of the image
 * @param {string} score
 * @param {string} [header] Header the score came from, used to pick the family
 * @returns {string} Path of Image
 */
async function getImageSrc(score, header) {
  if (score === null) return '/images/score_no.svg'
  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'scoreIconLowerBounds_vade',
    'scoreIconUpperBounds_vade',
    'scoreIconLowerBounds_pmx',
    'scoreIconUpperBounds_pmx'
  ])
  const classification = classifyScore(score, header, storage)
  if (classification === 'positive') return '/images/score_positive.svg'
  if (classification === 'negative') return '/images/score_negative.svg'
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

  // Get custom header order
  const storage = await localStorage.get(['scoreHeaderOrder'])
  const headerOrder = storage.scoreHeaderOrder || DEFAULT_SCORE_HEADER_ORDER

  // Get Score
  const scores = getScores(fullMessage.headers, headerOrder)
  const topScore = scores[0]
  const score = topScore && !isNaN(topScore.score) ? topScore.score : null
  const header = topScore ? topScore.header : null

  // Message Score Button
  if (score === null) {
    messageButton.disable(idTab)
    messageButton.setTitle({ tabId: idTab, title: i18n.getMessage('buttonNoScore') })
    messageButton.setIcon({ path: await getImageSrc(null) })
  } else {
    messageButton.enable(idTab)
    const unit = scoreUnit(header)
    const label = i18n.getMessage(unit ? 'popupTotalProbability' : 'popupTotalScore')
    messageButton.setTitle({ tabId: idTab, title: label + ': ' + score + unit })
    messageButton.setIcon({ path: await getImageSrc(score, header) })
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
    'scoreIconLowerBounds_vade',
    'scoreIconUpperBounds_vade',
    'scoreIconLowerBounds_pmx',
    'scoreIconUpperBounds_pmx',
    'customMailscannerHeaders',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative',
    'scoreHeaderOrder',
    'scoreDetailsHeaderOrder',
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

  // Init Data - push the icon bounds of every threshold family
  for (const familyKey of Object.keys(SCORE_FAMILIES)) {
    if (SCORE_FAMILIES[familyKey].mode !== 'threshold') continue
    const [lower, upper] = getFamilyBounds(storage, familyKey)
    if (familyKey === 'spamassassin') spamScores.setScoreBounds(lower, upper)
    else spamScores.setFamilyBounds(familyKey, lower, upper)
  }

  if (storage.customMailscannerHeaders) {
    spamScores.setCustomMailscannerHeaders(storage.customMailscannerHeaders)
  }

  // Set header order preferences
  if (storage.scoreHeaderOrder) {
    spamScores.setScoreHeaderOrder(storage.scoreHeaderOrder)
  }
  if (storage.scoreDetailsHeaderOrder) {
    spamScores.setScoreDetailsHeaderOrder(storage.scoreDetailsHeaderOrder)
  }

  spamScores.setHideIconScoreOptions(
    storage.hideIconScorePositive || false,
    storage.hideIconScoreNeutral || false,
    storage.hideIconScoreNegative || false
  )
  spamScores.addColumns(i18n.getMessage('columnScore'), i18n.getMessage('columnIcon'))
}
init()
