import { DEFAULT_SCORE_LOWER_BOUNDS, DEFAULT_SCORE_UPPER_BOUNDS } from '../constants.js'
import { getBounds } from '../functions.js'

// Variables
const localStorage = messenger.storage.local
const i18n = messenger.i18n

// DOM Variables
const inputScoreBoundsLower = document.getElementById('score-bounds-lower')
const inputScoreBoundsUpper = document.getElementById('score-bounds-upper')
const inputScoreBoundsBetween = document.getElementById('score-bounds-between')
const checkboxIconScorePositive = document.getElementById('hide-icon-score-positive')
const checkboxIconScoreNeutral = document.getElementById('hide-icon-score-neutral')
const checkboxIconScoreNegative = document.getElementById('hide-icon-score-negative')

// Translations
for (const i18nKey of ['optionsIconRanges', 'optionsScoreGreater', 'optionsScoreLess']) {
  document.querySelector('*[data-i18n="' + i18nKey + '"]').textContent = i18n.getMessage(i18nKey)
}
document
  .querySelectorAll('*[data-i18n="optionsHideIconAndScore"]')
  .forEach(el => (el.textContent = i18n.getMessage('optionsHideIconAndScore')))

// DOM Events
inputScoreBoundsLower.addEventListener('change', saveScoreLower)
inputScoreBoundsUpper.addEventListener('change', saveScoreUpper)
checkboxIconScorePositive.addEventListener('change', saveIconPositive)
checkboxIconScoreNeutral.addEventListener('change', saveIconNeutral)
checkboxIconScoreNegative.addEventListener('change', saveIconNegative)

async function init() {
  // Load Values from Storage
  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative'
  ])

  const [lowerBounds, upperBounds] = getBounds(storage)

  // Set Values
  inputScoreBoundsLower.value = lowerBounds
  inputScoreBoundsUpper.value = upperBounds
  inputScoreBoundsBetween.textContent = i18n.getMessage('optionsScoreBetween', [lowerBounds, upperBounds])
  messenger.SpamScores.setScoreBounds(lowerBounds, upperBounds)

  checkboxIconScorePositive.checked = storage.hideIconScorePositive || false
  checkboxIconScoreNeutral.checked = storage.hideIconScoreNeutral || false
  checkboxIconScoreNegative.checked = storage.hideIconScoreNegative || false
}
init()

function saveIconPositive() {
  const hideIconScorePositive = checkboxIconScorePositive.checked
  localStorage.set({ hideIconScorePositive })
  saveIcons()
}

function saveIconNeutral() {
  const hideIconScoreNeutral = checkboxIconScoreNeutral.checked
  localStorage.set({ hideIconScoreNeutral })
  saveIcons()
}

function saveIconNegative() {
  const hideIconScoreNegative = checkboxIconScoreNegative.checked
  localStorage.set({ hideIconScoreNegative })
  saveIcons()
}

function saveIcons() {
  // Get rest of values
  const hideIconScorePositive = checkboxIconScorePositive.checked
  const hideIconScoreNeutral = checkboxIconScoreNeutral.checked
  const hideIconScoreNegative = checkboxIconScoreNegative.checked

  messenger.SpamScores.setHideIconScoreOptions(hideIconScorePositive, hideIconScoreNeutral, hideIconScoreNegative)
}

async function saveScoreLower() {
  // Get Values that can kill the program
  const scoreBoundsLower = inputScoreBoundsLower.value
  const storage = await localStorage.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const newUpperBounds = parseFloat(storage.scoreIconUpperBounds || DEFAULT_SCORE_UPPER_BOUNDS)

  if (scoreBoundsLower !== '') {
    let newLowerBounds = parseFloat(scoreBoundsLower)
    try {
      if (newLowerBounds > newUpperBounds) throw Error('Upper score cannot be lower than lower bounds')
      if (newLowerBounds < -10000) throw Error('Wrong score lower bounds')
      localStorage.set({ scoreIconLowerBounds: newLowerBounds })
      saveScores(newLowerBounds, newUpperBounds)
    } catch (error) {
      // Restore data or Defaults
      newLowerBounds = parseFloat(storage.scoreIconLowerBounds || DEFAULT_SCORE_LOWER_BOUNDS)
    }
    // This way the value is a number
    inputScoreBoundsLower.value = newLowerBounds
  }
}

async function saveScoreUpper() {
  const scoreBoundsUpper = inputScoreBoundsUpper.value
  const storage = await localStorage.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const newLowerBounds = parseFloat(storage.scoreIconLowerBounds || DEFAULT_SCORE_LOWER_BOUNDS)

  if (scoreBoundsUpper !== '') {
    let newUpperBounds = parseFloat(scoreBoundsUpper)
    try {
      if (newLowerBounds > newUpperBounds) throw Error('Upper score cannot be lower than lower bounds')
      if (newUpperBounds > 10000) throw Error('Wrong score upper bounds')
      localStorage.set({ scoreIconUpperBounds: newUpperBounds })
      saveScores(newLowerBounds, newUpperBounds)
    } catch (error) {
      // Restore data or Defaults
      newUpperBounds = parseFloat(storage.scoreIconUpperBounds || DEFAULT_SCORE_UPPER_BOUNDS)
    }
    // This way the value is a number
    inputScoreBoundsUpper.value = newUpperBounds
  }
}

function saveScores(lower, upper) {
  inputScoreBoundsBetween.textContent = i18n.getMessage('optionsScoreBetween', [lower, upper])
  messenger.SpamScores.setScoreBounds(lower, upper)
}
