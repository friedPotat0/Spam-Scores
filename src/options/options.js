import {
  DEFAULT_SCORE_LOWER_BOUNDS,
  DEFAULT_SCORE_UPPER_BOUNDS,
  DEFAULT_SCORE_HEADER_ORDER,
  DEFAULT_SCORE_DETAILS_ORDER,
  SCORE_FAMILIES
} from '../constants.js'
import { getBounds, getFamilyBounds } from '../functions.js'

// Variables
const localStorage = messenger.storage.local
const i18n = messenger.i18n

// DOM variables
const inputScoreBoundsLower = document.getElementById('score-bounds-lower')
const inputScoreBoundsUpper = document.getElementById('score-bounds-upper')
const inputScoreBoundsBetween = document.getElementById('score-bounds-between')
const checkboxIconScorePositive = document.getElementById('hide-icon-score-positive')
const checkboxIconScoreNeutral = document.getElementById('hide-icon-score-neutral')
const checkboxIconScoreNegative = document.getElementById('hide-icon-score-negative')
const scoreHeadersList = document.getElementById('score-headers-list')
const scoreDetailsHeadersList = document.getElementById('score-details-headers-list')
const resetScoreHeadersBtn = document.getElementById('reset-score-headers')
const resetScoreDetailsHeadersBtn = document.getElementById('reset-score-details-headers')

// Translations
for (const element of document.querySelectorAll('[data-i18n]')) {
  const message = i18n.getMessage(element.dataset.i18n)
  if (message) element.textContent = message
}

// DOM events
inputScoreBoundsLower.addEventListener('change', saveScoreLower)
inputScoreBoundsUpper.addEventListener('change', saveScoreUpper)
checkboxIconScorePositive.addEventListener('change', saveIconPositive)
checkboxIconScoreNeutral.addEventListener('change', saveIconNeutral)
checkboxIconScoreNegative.addEventListener('change', saveIconNegative)
resetScoreHeadersBtn.addEventListener('click', resetScoreHeadersOrder)
resetScoreDetailsHeadersBtn.addEventListener('click', resetScoreDetailsHeadersOrder)

async function init() {
  // Load values from storage
  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'scoreIconLowerBounds_vade',
    'scoreIconUpperBounds_vade',
    'scoreIconLowerBounds_pmx',
    'scoreIconUpperBounds_pmx',
    'hideIconScorePositive',
    'hideIconScoreNeutral',
    'hideIconScoreNegative',
    'scoreHeaderOrder',
    'scoreDetailsHeaderOrder'
  ])

  const [lowerBounds, upperBounds] = getBounds(storage)

  // Set values
  inputScoreBoundsLower.value = lowerBounds
  inputScoreBoundsUpper.value = upperBounds
  inputScoreBoundsBetween.textContent = i18n.getMessage('optionsScoreBetween', [lowerBounds, upperBounds])
  messenger.SpamScores.setScoreBounds(lowerBounds, upperBounds)

  checkboxIconScorePositive.checked = storage.hideIconScorePositive || false
  checkboxIconScoreNeutral.checked = storage.hideIconScoreNeutral || false
  checkboxIconScoreNegative.checked = storage.hideIconScoreNegative || false

  renderFamilyBounds(storage)

  // Initialize header order lists
  const scoreHeaderOrder = storage.scoreHeaderOrder || DEFAULT_SCORE_HEADER_ORDER
  const scoreDetailsHeaderOrder = storage.scoreDetailsHeaderOrder || DEFAULT_SCORE_DETAILS_ORDER

  renderSortableList(scoreHeadersList, scoreHeaderOrder, 'scoreHeaderOrder')
  renderSortableList(scoreDetailsHeadersList, scoreDetailsHeaderOrder, 'scoreDetailsHeaderOrder')
}
init()

const FAMILY_LABELS = { vade: 'optionsFamilyVade', pmx: 'optionsFamilyPmx' }

function renderFamilyBounds(storage) {
  const container = document.getElementById('family-bounds')
  container.innerHTML = ''
  for (const familyKey of Object.keys(SCORE_FAMILIES)) {
    if (SCORE_FAMILIES[familyKey].mode !== 'threshold' || familyKey === 'spamassassin') continue
    const [lower, upper] = getFamilyBounds(storage, familyKey)
    messenger.SpamScores.setFamilyBounds(familyKey, lower, upper)

    const block = document.createElement('div')
    const title = document.createElement('h3')
    title.style.cssText = 'margin-bottom: 5px; font-size: 1em'
    title.textContent = i18n.getMessage(FAMILY_LABELS[familyKey]) || familyKey
    block.appendChild(title)
    block.appendChild(familyBoundLine('/images/score_positive.svg', 'optionsScoreGreater', familyKey, 'upper', upper))
    block.appendChild(familyBoundLine('/images/score_negative.svg', 'optionsScoreLess', familyKey, 'lower', lower))
    container.appendChild(block)
  }
}

function familyBoundLine(icon, labelKey, familyKey, bound, value) {
  const line = document.createElement('div')
  line.className = 'input-line'
  const img = document.createElement('img')
  img.width = 20
  img.src = icon
  const span = document.createElement('span')
  span.textContent = i18n.getMessage(labelKey)
  const input = document.createElement('input')
  input.type = 'number'
  input.step = '1'
  input.value = value
  input.style.cssText = 'margin-left: 5px; width: 80px'
  input.dataset.family = familyKey
  input.dataset.bound = bound
  input.addEventListener('change', () => saveFamilyBounds(familyKey))
  line.append(img, span, input)
  return line
}

async function saveFamilyBounds(familyKey) {
  const container = document.getElementById('family-bounds')
  const lowerInput = container.querySelector('input[data-family="' + familyKey + '"][data-bound="lower"]')
  const upperInput = container.querySelector('input[data-family="' + familyKey + '"][data-bound="upper"]')
  let lower = parseFloat(lowerInput.value)
  let upper = parseFloat(upperInput.value)
  const [defaultLower, defaultUpper] = getFamilyBounds({}, familyKey)
  if (isNaN(lower)) lower = defaultLower
  if (isNaN(upper)) upper = defaultUpper
  if (lower > upper) {
    const stored = await localStorage.get(['scoreIconLowerBounds_' + familyKey, 'scoreIconUpperBounds_' + familyKey])
    ;[lower, upper] = getFamilyBounds(stored, familyKey)
  }
  lowerInput.value = lower
  upperInput.value = upper
  await localStorage.set({
    ['scoreIconLowerBounds_' + familyKey]: lower,
    ['scoreIconUpperBounds_' + familyKey]: upper
  })
  messenger.SpamScores.setFamilyBounds(familyKey, lower, upper)
}

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
  const scoreBoundsLower = inputScoreBoundsLower.value
  const storage = await localStorage.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const newUpperBounds = parseFloat(storage.scoreIconUpperBounds ?? DEFAULT_SCORE_UPPER_BOUNDS)

  if (scoreBoundsLower !== '') {
    let newLowerBounds = parseFloat(scoreBoundsLower)
    try {
      if (newLowerBounds > newUpperBounds) throw Error('Upper score cannot be lower than lower bounds')
      if (newLowerBounds < -10000) throw Error('Wrong score lower bounds')
      localStorage.set({ scoreIconLowerBounds: newLowerBounds })
      saveScores(newLowerBounds, newUpperBounds)
    } catch (error) {
      // Restore previously saved bounds or fallback to defaults
      newLowerBounds = parseFloat(storage.scoreIconLowerBounds ?? DEFAULT_SCORE_LOWER_BOUNDS)
    }
    inputScoreBoundsLower.value = newLowerBounds // number
  }
}

async function saveScoreUpper() {
  const scoreBoundsUpper = inputScoreBoundsUpper.value
  const storage = await localStorage.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  const newLowerBounds = parseFloat(storage.scoreIconLowerBounds ?? DEFAULT_SCORE_LOWER_BOUNDS)

  if (scoreBoundsUpper !== '') {
    let newUpperBounds = parseFloat(scoreBoundsUpper)
    try {
      if (newLowerBounds > newUpperBounds) throw Error('Upper score cannot be lower than lower bounds')
      if (newUpperBounds > 10000) throw Error('Wrong score upper bounds')
      localStorage.set({ scoreIconUpperBounds: newUpperBounds })
      saveScores(newLowerBounds, newUpperBounds)
    } catch (error) {
      // Restore previously saved bounds or fallback to defaults
      newUpperBounds = parseFloat(storage.scoreIconUpperBounds ?? DEFAULT_SCORE_UPPER_BOUNDS)
    }
    inputScoreBoundsUpper.value = newUpperBounds // number
  }
}

function saveScores(lower, upper) {
  inputScoreBoundsBetween.textContent = i18n.getMessage('optionsScoreBetween', [lower, upper])
  messenger.SpamScores.setScoreBounds(lower, upper)
}

/**
 * Render a sortable list of headers
 * @param {HTMLElement} container - The container element for the list
 * @param {string[]} headers - Array of header names
 * @param {string} storageKey - Key for localStorage
 */
function renderSortableList(container, headers, storageKey) {
  container.innerHTML = ''

  headers.forEach((header, index) => {
    const item = document.createElement('div')
    item.className = 'sortable-item'
    item.textContent = header
    item.draggable = true
    item.dataset.index = index

    item.addEventListener('dragstart', handleDragStart)
    item.addEventListener('dragover', handleDragOver)
    item.addEventListener('drop', e => handleDrop(e, container, storageKey))
    item.addEventListener('dragend', handleDragEnd)

    container.appendChild(item)
  })
}

let draggedElement = null

function handleDragStart(e) {
  draggedElement = e.target
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault()
  }
  e.dataTransfer.dropEffect = 'move'
  return false
}

function handleDrop(e, container, storageKey) {
  if (e.stopPropagation) {
    e.stopPropagation()
  }

  if (draggedElement !== e.target && e.target.classList.contains('sortable-item')) {
    // Get all items
    const items = Array.from(container.querySelectorAll('.sortable-item'))
    const draggedIndex = items.indexOf(draggedElement)
    const targetIndex = items.indexOf(e.target)

    // Reorder in DOM
    if (draggedIndex < targetIndex) {
      e.target.parentNode.insertBefore(draggedElement, e.target.nextSibling)
    } else {
      e.target.parentNode.insertBefore(draggedElement, e.target)
    }

    // Save new order
    saveHeaderOrder(container, storageKey)
  }

  return false
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging')
}

/**
 * Save the current order of headers to localStorage
 * @param {HTMLElement} container - The container element
 * @param {string} storageKey - Key for localStorage
 */
async function saveHeaderOrder(container, storageKey) {
  const items = Array.from(container.querySelectorAll('.sortable-item'))
  const order = items.map(item => item.textContent)

  await localStorage.set({ [storageKey]: order })

  // Update experiments.js
  if (storageKey === 'scoreHeaderOrder') {
    messenger.SpamScores.setScoreHeaderOrder(order)
  } else if (storageKey === 'scoreDetailsHeaderOrder') {
    messenger.SpamScores.setScoreDetailsHeaderOrder(order)
  }
}

/**
 * Reset score headers to default order
 */
async function resetScoreHeadersOrder() {
  await localStorage.set({ scoreHeaderOrder: DEFAULT_SCORE_HEADER_ORDER })
  renderSortableList(scoreHeadersList, DEFAULT_SCORE_HEADER_ORDER, 'scoreHeaderOrder')
  messenger.SpamScores.setScoreHeaderOrder(DEFAULT_SCORE_HEADER_ORDER)
}

/**
 * Reset score details headers to default order
 */
async function resetScoreDetailsHeadersOrder() {
  await localStorage.set({ scoreDetailsHeaderOrder: DEFAULT_SCORE_DETAILS_ORDER })
  renderSortableList(scoreDetailsHeadersList, DEFAULT_SCORE_DETAILS_ORDER, 'scoreDetailsHeaderOrder')
  messenger.SpamScores.setScoreDetailsHeaderOrder(DEFAULT_SCORE_DETAILS_ORDER)
}
