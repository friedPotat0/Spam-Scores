import { DEFAULT_SCORE_LOWER_BOUNDS, DEFAULT_SCORE_UPPER_BOUNDS } from '../constants.js'
import { getBounds } from '../functions.js'

// DOM Variables
const inputScoreBoundsLower = document.getElementById('score-bounds-lower')
const inputScoreBoundsUpper = document.getElementById('score-bounds-upper')
const inputScoreBoundsBetween = document.getElementById('score-bounds-between')
const checkboxIconScorePositive = document.getElementById('hide-icon-score-positive')
const checkboxIconScoreNeutral = document.getElementById('hide-icon-score-neutral')
const checkboxIconScoreNegative = document.getElementById('hide-icon-score-negative')

async function init() {
  // Preparations
  initTranslations()

  // DOM Events

  /**
   * TODO: [General] For every event from one input, it gets all data from the others,
   * which is not optimized
   */
  inputScoreBoundsLower.addEventListener('change', save)
  inputScoreBoundsUpper.addEventListener('change', save)
  checkboxIconScorePositive.addEventListener('change', save)
  checkboxIconScoreNeutral.addEventListener('change', save)
  checkboxIconScoreNegative.addEventListener('change', save)

  // Load Values from Storage
  const storage = await browser.storage.local.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative'
  ])

  const [lowerBounds, upperBounds] = getBounds(storage)

  const hideIconScorePositive =
    storage && storage.hideIconScorePositive !== undefined ? storage.hideIconScorePositive : false
  const hideIconScoreNeutral =
    storage && storage.hideIconScoreNeutral !== undefined ? storage.hideIconScoreNeutral : false
  const hideIconScoreNegative =
    storage && storage.hideIconScoreNegative !== undefined ? storage.hideIconScoreNegative : false

  // Set Values
  inputScoreBoundsLower.value = lowerBounds
  inputScoreBoundsUpper.value = upperBounds
  inputScoreBoundsBetween.textContent = browser.i18n.getMessage('optionsScoreBetween', [lowerBounds, upperBounds])
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setScoreBounds(lowerBounds, upperBounds)

  checkboxIconScorePositive.checked = hideIconScorePositive
  checkboxIconScoreNeutral.checked = hideIconScoreNeutral
  checkboxIconScoreNegative.checked = hideIconScoreNegative
}
init()

/**
 *
 */
async function save() {
  // Declaration
  let newLowerBounds, newUpperBounds, hideIconScorePositive, hideIconScoreNeutral, hideIconScoreNegative
  const storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  try {
    newLowerBounds = parseFloat(inputScoreBoundsLower.value)
    newUpperBounds = parseFloat(inputScoreBoundsUpper.value)
    if (newLowerBounds > newUpperBounds) {
      newLowerBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconLowerBounds
          : DEFAULT_SCORE_LOWER_BOUNDS
      )
      newUpperBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconUpperBounds
          : DEFAULT_SCORE_UPPER_BOUNDS
      )
      throw Error('Upper score cannot be lower than lower bounds')
    }
    if (newUpperBounds < -10000) {
      newLowerBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconLowerBounds
          : DEFAULT_SCORE_LOWER_BOUNDS
      )
      throw Error('Wrong score lower bounds')
    }
    if (newUpperBounds > 10000) {
      newUpperBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconUpperBounds
          : DEFAULT_SCORE_UPPER_BOUNDS
      )
      throw Error('Wrong score upper bounds')
    }
    hideIconScorePositive = checkboxIconScorePositive.checked
    hideIconScoreNeutral = checkboxIconScoreNeutral.checked
    hideIconScoreNegative = checkboxIconScoreNegative.checked
    browser.storage.local.set({
      scoreIconLowerBounds: newLowerBounds,
      scoreIconUpperBounds: newUpperBounds,
      hideIconScorePositive: hideIconScorePositive,
      hideIconScoreNeutral: hideIconScoreNeutral,
      hideIconScoreNegative: hideIconScoreNegative
    })
  } catch (err) {
    console.error(err)
  }
  inputScoreBoundsLower.value = newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  inputScoreBoundsUpper.value = newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  inputScoreBoundsBetween.textContent = browser.i18n.getMessage('optionsScoreBetween', [
    newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS,
    newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  ])
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setScoreBounds(
    parseFloat(newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS),
    parseFloat(newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS)
  )
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setHideIconScoreOptions(
    hideIconScorePositive || false,
    hideIconScoreNeutral || false,
    hideIconScoreNegative || false
  )
}

function initTranslations() {
  document
    .querySelectorAll('*[data-i18n="optionsIconRanges"]')
    .forEach(el => (el.textContent = browser.i18n.getMessage('optionsIconRanges')))
  document
    .querySelectorAll('*[data-i18n="optionsScoreGreater"]')
    .forEach(el => (el.textContent = browser.i18n.getMessage('optionsScoreGreater')))
  document
    .querySelectorAll('*[data-i18n="optionsScoreBetween"]')
    .forEach(
      el =>
        (el.textContent = browser.i18n.getMessage('optionsScoreBetween', [
          DEFAULT_SCORE_LOWER_BOUNDS,
          DEFAULT_SCORE_UPPER_BOUNDS
        ]))
    )
  document
    .querySelectorAll('*[data-i18n="optionsScoreLess"]')
    .forEach(el => (el.textContent = browser.i18n.getMessage('optionsScoreLess')))
  document
    .querySelectorAll('*[data-i18n="optionsHideIconAndScore"]')
    .forEach(el => (el.textContent = browser.i18n.getMessage('optionsHideIconAndScore')))
}
