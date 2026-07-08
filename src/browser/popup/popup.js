import { SCORE_SYMBOLS } from './score_symbols.js'
import { DEFAULT_SCORE_DETAILS_ORDER, DEFAULT_SCORE_HEADER_ORDER, SCORE_FAMILIES } from '../../constants.js'
import {
  parseDetailScores,
  deduplicateValues,
  getScores,
  getScoreFamily,
  getFamilyBounds,
  classifyScore
} from '../../functions.js'

const localStorage = messenger.storage.local
const i18n = messenger.i18n

const VERDICT_LABEL = {
  positive: 'popupVerdictSpam',
  neutral: 'popupVerdictNeutral',
  negative: 'popupVerdictHam'
}

for (const element of document.querySelectorAll('[data-i18n]')) {
  const message = i18n.getMessage(element.dataset.i18n)
  if (message) element.textContent = message
}

messenger.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
  const message = await messenger.messageDisplay.getDisplayedMessage(tabs[0].id)
  const headers = (await messenger.messages.getFull(message.id)).headers

  const storage = await localStorage.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'scoreIconLowerBounds_vade',
    'scoreIconUpperBounds_vade',
    'scoreIconLowerBounds_pmx',
    'scoreIconUpperBounds_pmx',
    'scoreHeaderOrder',
    'scoreDetailsHeaderOrder',
    'customMailscannerHeaders'
  ])

  renderSummary(headers, storage)
  await renderRules(headers, storage)

  // Workaround for a bug where Thunderbird does not correctly calculate the popup window height in Wide View layout (see issue #33)
  document.body.style.maxHeight = `${window.screen.height / 2 - 60}px`
})

/**
 * Fills the summary header with the total score, verdict and gauge.
 * @param {Object<string, string[]>} headers
 * @param {object} storage
 */
function renderSummary(headers, storage) {
  const top = getScores(headers, storage.scoreHeaderOrder || DEFAULT_SCORE_HEADER_ORDER)[0]
  if (!top || isNaN(top.score)) return

  const familyKey = getScoreFamily(top.header)
  const classification = classifyScore(top.score, top.header, storage)

  const summary = document.getElementById('score-summary')
  summary.classList.add(classification)
  document.getElementById('total-score').textContent = formatTotal(top.score, familyKey)
  document.getElementById('verdict-label').textContent = i18n.getMessage(VERDICT_LABEL[classification])

  if (SCORE_FAMILIES[familyKey].mode === 'flag') {
    summary.classList.add('no-scale')
  } else {
    const [lower, upper] = getFamilyBounds(storage, familyKey)
    document.getElementById('gauge-lower').textContent = lower
    document.getElementById('gauge-upper').textContent = upper
    document.getElementById('score-gauge-marker').style.left = gaugePos(parseFloat(top.score), lower, upper)
  }

  summary.style.display = ''
}

/**
 * Renders the matched rules grouped by their effect on the score.
 * @param {Object<string, string[]>} headers
 * @param {object} storage
 */
async function renderRules(headers, storage) {
  const customHeaders = storage.customMailscannerHeaders || []
  const scoreDetailsOrder = storage.scoreDetailsHeaderOrder || DEFAULT_SCORE_DETAILS_ORDER
  const rules = await deduplicateValues(parseDetailScores(headers, scoreDetailsOrder, customHeaders))
  if (rules.length === 0) return

  document.getElementById('no-details').style.display = 'none'

  const groups = {
    positive: rules.filter(el => el.score > 0).sort((a, b) => b.score - a.score),
    negative: rules.filter(el => el.score < 0).sort((a, b) => a.score - b.score),
    neutral: rules.filter(el => el.score === 0).sort((a, b) => a.name.localeCompare(b.name))
  }
  const maxWeight = Math.max(...rules.map(el => Math.abs(el.score)), 0) || 1
  const rowTemplate = document.getElementById('score-detail-row')

  for (const groupType of ['positive', 'negative', 'neutral']) {
    if (groups[groupType].length === 0) continue
    const list = document.querySelector(`#rules-${groupType} .rule-list`)
    for (const detail of groups[groupType]) {
      const symbolDescription = SCORE_SYMBOLS.find(sym => sym.name === detail.name)?.description
      const row = document.importNode(rowTemplate.content, true)
      row.querySelector('.score').textContent = formatRuleScore(detail.score)
      row.querySelector('.weight-fill').style.width = (Math.abs(detail.score) / maxWeight) * 100 + '%'
      row.querySelector('.name').textContent = detail.name || '-'
      row.querySelector('.description').textContent = symbolDescription || detail.description || ''
      const info = row.querySelector('.info')
      if (detail.info) info.textContent = `[${detail.info}]`
      else info.remove()
      list.append(row)
    }
    document.getElementById(`rules-${groupType}`).style.display = ''
  }
}

function formatTotal(score, familyKey) {
  return familyKey === 'spamassassin' && parseFloat(score) > 0 ? '+' + score : String(score)
}

function formatRuleScore(score) {
  return score > 0 ? '+' + score : String(score)
}

function gaugePos(score, lower, upper) {
  const span = upper - lower || 1
  let pct
  if (score < lower) pct = (30 * (score - (lower - span))) / span
  else if (score <= upper) pct = 30 + (40 * (score - lower)) / span
  else pct = 70 + (30 * (score - upper)) / span
  return Math.max(1.5, Math.min(98.5, pct)) + '%'
}
