const DEFAULT_SCORE_LOWER_BOUNDS = -2.0
const DEFAULT_SCORE_UPPER_BOUNDS = 2.0

async function init() {
  initTranslations()

  let storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  let lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  )
  let upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  )
  document.querySelector('#score-bounds-lower').value = lowerBounds
  document.querySelector('#score-bounds-upper').value = upperBounds
  document.querySelector('#score-bounds-between').textContent = browser.i18n.getMessage('optionsScoreBetween', [
    lowerBounds,
    upperBounds
  ])
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setScoreBounds(
    parseFloat(lowerBounds),
    parseFloat(upperBounds)
  )

  document.querySelector('#score-bounds-lower').addEventListener('change', save)
  document.querySelector('#score-bounds-upper').addEventListener('change', save)
}
init()

async function save() {
  let newLowerBounds, newUpperBounds
  let storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  try {
    newLowerBounds = parseFloat(document.querySelector('#score-bounds-lower').value)
    newUpperBounds = parseFloat(document.querySelector('#score-bounds-upper').value)
    if (!(newLowerBounds <= 0 && newUpperBounds >= -10000)) {
      newLowerBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconLowerBounds
          : DEFAULT_SCORE_LOWER_BOUNDS
      )
      throw Error('Wrong score lower bounds')
    }
    if (!(newUpperBounds >= 0 && newUpperBounds <= 10000)) {
      newUpperBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconUpperBounds
          : DEFAULT_SCORE_UPPER_BOUNDS
      )
      throw Error('Wrong score upper bounds')
    }
    browser.storage.local.set({
      scoreIconLowerBounds: newLowerBounds,
      scoreIconUpperBounds: newUpperBounds
    })
  } catch (err) {
    console.error(err)
  }
  document.querySelector('#score-bounds-lower').value =
    newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  document.querySelector('#score-bounds-upper').value =
    newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  document.querySelector('#score-bounds-between').textContent = browser.i18n.getMessage('optionsScoreBetween', [
    newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS,
    newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  ])
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setScoreBounds(
    parseFloat(newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS),
    parseFloat(newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS)
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
}
