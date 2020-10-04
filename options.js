const DEFAULT_SCORE_LOWER_BOUNDS = -2.0
const DEFAULT_SCORE_UPPER_BOUNDS = 2.0

async function init() {
  let storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  let lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined
      ? storage.scoreIconLowerBounds
      : DEFAULT_SCORE_LOWER_BOUNDS.toFixed(2)
  ).toFixed(2)
  let upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined
      ? storage.scoreIconUpperBounds
      : DEFAULT_SCORE_UPPER_BOUNDS.toFixed(2)
  ).toFixed(2)
  document.querySelector('#score-bounds-lower').value = lowerBounds
  document.querySelector('#score-bounds-upper').value = upperBounds
  document.querySelector('.score-bounds-lower-value').textContent = lowerBounds
  document.querySelector('.score-bounds-upper-value').textContent = upperBounds
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
    newLowerBounds = parseFloat(document.querySelector('#score-bounds-lower').value).toFixed(2)
    newUpperBounds = parseFloat(document.querySelector('#score-bounds-upper').value).toFixed(2)
    if (!(newLowerBounds <= 0 && newUpperBounds >= -10000)) {
      newLowerBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconLowerBounds
          : DEFAULT_SCORE_LOWER_BOUNDS.toFixed(2)
      ).toFixed(2)
      throw Error('Wrong score lower bounds')
    }
    if (!(newUpperBounds >= 0 && newUpperBounds <= 10000)) {
      newUpperBounds = parseFloat(
        storage && storage.scoreIconLowerBounds !== undefined
          ? storage.scoreIconUpperBounds
          : DEFAULT_SCORE_UPPER_BOUNDS.toFixed(2)
      ).toFixed(2)
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
    newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS.toFixed(2)
  document.querySelector('#score-bounds-upper').value =
    newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS.toFixed(2)
  document.querySelector('.score-bounds-lower-value').textContent =
    newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS.toFixed(2)
  document.querySelector('.score-bounds-upper-value').textContent =
    newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS.toFixed(2)
  ;(await messenger.runtime.getBackgroundPage()).messenger.SpamScores.setScoreBounds(
    parseFloat(newLowerBounds !== null ? newLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS).toFixed(2),
    parseFloat(newUpperBounds !== null ? newUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS).toFixed(2)
  )
}
