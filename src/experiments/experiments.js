'use strict'

// Copy of constants.js until Experiments API supports ES6 modules
const CUSTOM_SCORE_REGEX = {
  'mailscanner-spamcheck':
    /(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),/
}

// Copy of constants.js until Experiments API supports ES6 modules
const SCORE_REGEX = {
  'x-spamd-result': /\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];/,
  'x-spam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-rspam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-report': /([-+]?[0-9]+\.?[0-9]*) hits,/,
  'x-ham-report': /([-+]?[0-9]+\.?[0-9]*) hits,/,
  'x-rspamd-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-vr-spamscore': /([0-9]+)/,
  'x-hmailserver-reason-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-pmx-spam': /Probability=([0-9]+)%/,
  'x-gmx-antispam': /^([0-9]+)/
}

// Default order for parsing score headers
const DEFAULT_SCORE_HEADER_ORDER = [
  'x-spamd-result',
  'x-spam-status',
  'x-rspam-status',
  'x-spam-score',
  'x-spam-report',
  'x-ham-report',
  'x-rspamd-score',
  'x-vr-spamscore',
  'x-hmailserver-reason-score',
  'x-pmx-spam',
  'x-gmx-antispam'
]

function importThreadPaneColumnsModule() {
  try {
    // TB115
    return ChromeUtils.importESModule('chrome://messenger/content/thread-pane-columns.mjs')
  } catch (err) {
    // TB128
    return ChromeUtils.importESModule('chrome://messenger/content/ThreadPaneColumns.mjs')
  }
}

var { ThreadPaneColumns } = importThreadPaneColumnsModule()

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2

// Copy of constants.js until Experiments API supports ES6 modules
const SCORE_FAMILIES = {
  spamassassin: { mode: 'threshold', defaultLowerBounds: DEFAULT_SCORE_LOWER_BOUNDS, defaultUpperBounds: DEFAULT_SCORE_UPPER_BOUNDS },
  vade: { mode: 'threshold', defaultLowerBounds: 100, defaultUpperBounds: 300 },
  pmx: { mode: 'threshold', defaultLowerBounds: 20, defaultUpperBounds: 50 },
  gmx: { mode: 'flag' }
}
const SCORE_HEADER_FAMILY = {
  'x-vr-spamscore': 'vade',
  'x-pmx-spam': 'pmx',
  'x-gmx-antispam': 'gmx'
}

function familyDefault(familyKey) {
  const family = SCORE_FAMILIES[familyKey]
  return [family.defaultLowerBounds, family.defaultUpperBounds]
}

function classify(score, header, familyBounds) {
  const familyKey = SCORE_HEADER_FAMILY[header] || 'spamassassin'
  if (SCORE_FAMILIES[familyKey].mode === 'flag') return parseFloat(score) === 0 ? 'negative' : 'positive'
  const [lower, upper] = familyBounds[familyKey] || familyDefault(familyKey)
  const value = parseFloat(score)
  if (value > upper) return 'positive'
  if (value < lower) return 'negative'
  return 'neutral'
}

let scoreHdrViewParams = {
  familyBounds: {
    spamassassin: familyDefault('spamassassin'),
    vade: familyDefault('vade'),
    pmx: familyDefault('pmx')
  },
  scoreHeaderOrder: DEFAULT_SCORE_HEADER_ORDER
}

function getScore(hdr) {
  // Use custom order if available, otherwise use default
  const headerOrder = scoreHdrViewParams.scoreHeaderOrder || DEFAULT_SCORE_HEADER_ORDER

  for (const regExName of headerOrder) {
    if (!SCORE_REGEX[regExName]) continue // Skip if regex not defined
    const headerValue = hdr.getStringProperty(regExName)
    if (headerValue === '') continue
    // Thunderbird stores duplicate headers as one string - keep the highest score it contains
    let score = null
    for (const match of headerValue.matchAll(new RegExp(SCORE_REGEX[regExName], 'g'))) {
      const value = parseFloat(match[1])
      if (!isNaN(value) && (score === null || value > score)) score = value
    }
    if (score !== null) return { score, header: regExName }
  }

  if (scoreHdrViewParams.customMailscannerHeaders) {
    for (const headerName of scoreHdrViewParams.customMailscannerHeaders) {
      for (const regExName in CUSTOM_SCORE_REGEX) {
        if (headerName.endsWith(regExName)) {
          const headerValue = hdr.getStringProperty(headerName)
          const scoreField = headerValue.match(CUSTOM_SCORE_REGEX[regExName])
          if (!scoreField) continue // If no match iterate
          const score = parseFloat(scoreField[1])
          if (!isNaN(score)) return { score, header: headerName }
        }
      }
    }
  }
  return null
}

function getSortScore(hdr) {
  const result = getScore(hdr)
  if (result === null) return null
  // Multiply by 100000 for decimal precision, then add offset of 1 billion to handle negative numbers
  // This ensures both negative and positive scores sort correctly
  return Math.round(result.score * 100000) + 1000000000
}

/**
 * For debugging Experiments.js, press CTRL + SHIFT + U/I
 */

/**
 * Do not change var because it's a global class
 * https://webextension-api.thunderbird.net/en/91/how-to/experiments.html#implementing-functions
 */
var SpamScores = class extends ExtensionAPI {
  /**
   * Called on startup and on reload
   */
  onStartup() {
    updatePrefs()
  }

  /**
   * Called when the extension is disabled, removed, reloaded, or Thunderbird closes.
   * @param {boolean} isAppShutdown
   */
  onShutdown(isAppShutdown) {
    if (isAppShutdown) return
    /**
     * This method is called to notify all observers for a particular topic. See Example.
     * .notifyObservers(null, "myTopicID", "someAdditionalInformationPassedAs'Data'Parameter");
     *
     * void notifyObservers(in nsISupports aSubject, in string aTopic, in wstring someData);
     * aSubject A notification specific interface pointer. This usually corresponds to the source of the notification, but could be defined differently depending on the notification topic and may even be null.
     * aTopic The notification topic. This string-valued key uniquely identifies the notification. This parameter must not be null.
     * someData A notification specific string value. The meaning of this parameter is dependent on the topic. It may be null.
     */
    Services.obs.notifyObservers(null, 'startupcache-invalidate')
  }

  /**
   *
   * @param {*} context
   * @returns
   */
  getAPI(context) {
    context.callOnClose(this)
    // All functions should be added in schema.json
    return {
      SpamScores: {
        setScoreBounds(lower, upper) {
          scoreHdrViewParams.familyBounds.spamassassin = [lower, upper]
        },
        setFamilyBounds(family, lower, upper) {
          scoreHdrViewParams.familyBounds[family] = [lower, upper]
        },
        setHideIconScoreOptions(hidePositive, hideNeutral, hideNegative) {
          scoreHdrViewParams.hideIconScorePositive = hidePositive
          scoreHdrViewParams.hideIconScoreNeutral = hideNeutral
          scoreHdrViewParams.hideIconScoreNegative = hideNegative
        },
        setCustomMailscannerHeaders(customMailscannerHeaders) {
          scoreHdrViewParams.customMailscannerHeaders = customMailscannerHeaders
        },
        setScoreHeaderOrder(scoreHeaderOrder) {
          scoreHdrViewParams.scoreHeaderOrder = scoreHeaderOrder
        },
        setScoreDetailsHeaderOrder(scoreDetailsHeaderOrder) {
          scoreHdrViewParams.scoreDetailsHeaderOrder = scoreDetailsHeaderOrder
        },
        addHeadersToPrefs(dynamicHeaders) {
          updatePrefs(dynamicHeaders)
        },
        // Deprecated (Fallback for add-on version <= 1.3.1)
        getHelloFlag() {
          try {
            return Services.prefs.getBoolPref('spamscores.hello')
          } catch (err) {
            return false
          }
        },

        async addColumns(nameSpamScoreValue, nameSpamScoreIcon) {
          function getExtensionUrl(url) {
            if (url) {
              return context.extension.baseURI.resolve(url)
            }
            return null
          }
          function scoreCallback(msgHdr) {
            const result = getScore(msgHdr)
            if (result === null) return null
            const classification = classify(result.score, result.header, scoreHdrViewParams.familyBounds)
            if (classification === 'positive' && scoreHdrViewParams.hideIconScorePositive) return null
            if (classification === 'neutral' && scoreHdrViewParams.hideIconScoreNeutral) return null
            if (classification === 'negative' && scoreHdrViewParams.hideIconScoreNegative) return null
            return result.score
          }

          ThreadPaneColumns.addCustomColumn('spam-score-value', {
            name: nameSpamScoreValue,
            hidden: true,
            icon: false,
            resizable: true,
            sortable: true,
            sortCallback: getSortScore,
            textCallback: scoreCallback
          })

          ThreadPaneColumns.addCustomColumn('spam-score-icon', {
            name: nameSpamScoreIcon,
            hidden: true,
            icon: true,
            iconHeaderUrl: getExtensionUrl('/images/icon-16px.png'),
            iconCellDefinitions: [
              {
                id: 'positive',
                alt: '+',
                title: 'Positive Spam Score',
                url: getExtensionUrl('/images/score_positive.png')
              },
              {
                id: 'negative',
                alt: '-',
                title: 'Negative Spam Score',
                url: getExtensionUrl('/images/score_negative.png')
              },
              {
                id: 'neutral',
                alt: '0',
                title: 'Neutral Spam Score',
                url: getExtensionUrl('/images/score_neutral.png')
              }
            ],
            iconCallback: msgHdr => {
              const result = getScore(msgHdr)
              if (result === null) return ''
              const classification = classify(result.score, result.header, scoreHdrViewParams.familyBounds)
              if (classification === 'positive' && !scoreHdrViewParams.hideIconScorePositive) return 'positive'
              if (classification === 'neutral' && !scoreHdrViewParams.hideIconScoreNeutral) return 'neutral'
              if (classification === 'negative' && !scoreHdrViewParams.hideIconScoreNegative) return 'negative'
              return ''
            },
            resizable: false,
            sortable: true,
            sortCallback: getSortScore,
            textCallback: scoreCallback
          })
        },

        async removeColumns(id) {
          ThreadPaneColumns.removeCustomColumn('spam-score-value')
          ThreadPaneColumns.removeCustomColumn('spam-score-icon')
        }
      }
    }
  }

  close() {
    ThreadPaneColumns.removeCustomColumn('spam-score-value')
    ThreadPaneColumns.removeCustomColumn('spam-score-icon')
  }
}

/**
 * This is what it lets nsIMsgDBHdr have the properties of the headers
 * http://kb.mozillazine.org/Mail_and_news_settings // 2019
 * http://udn.realityripple.com/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPrefBranch
 * https://searchfox.org/comm-central/source/mailnews/mailnews.js // 2021
 * Requirements: Repair Folders then Restart
 * @param {string[]} dynamicHeaders
 */
function updatePrefs(dynamicHeaders = []) {
  const mailnews = Services.prefs.getBranch('mailnews')
  // Copy of constants.js until support of ES6 modules
  const staticHeaders = [
    'x-spam-score',
    'x-rspamd-score',
    'x-vr-spamscore',
    'x-spamd-result',
    'x-spam-status',
    'x-rspam-status',
    'x-spam-report',
    'x-ham-report',
    'x-hmailserver-reason-score',
    'x-pmx-spam',
    'x-gmx-antispam'
  ]
  const headers = [...staticHeaders, ...dynamicHeaders]

  // customDBHeaders: String in the form of "header1 header2 header3"
  // Note: Do not overwrite headers of other add-ons or user-defined ones. Always append new headers!
  const existingCustomDBHeaders = Services.prefs.getCharPref('mailnews.customDBHeaders').trim()
  // Split existing headers and filter out new ones that already exist
  const existingDBHeadersArray = existingCustomDBHeaders ? existingCustomDBHeaders.split(/\s+/) : []
  let newCustomDBHeaders = headers.filter(el => !existingDBHeadersArray.includes(el))
  if (newCustomDBHeaders.length > 0) {
    const separator = existingCustomDBHeaders ? ' ' : ''
    newCustomDBHeaders = `${existingCustomDBHeaders}${separator}${newCustomDBHeaders.join(' ')}`
    mailnews.setCharPref('.customDBHeaders', newCustomDBHeaders)
  }

  // customHeaders: String in the form of "header1: header2: header3:"
  // Note: Do not overwrite headers of other add-ons or user-defined ones. Always append new headers!
  const existingCustomHeaders = Services.prefs.getCharPref('mailnews.customHeaders').trim()
  // Split existing headers by ": " and filter out new ones that already exist
  const existingHeadersArray = existingCustomHeaders
    ? existingCustomHeaders
        .split(/:\s*/)
        .filter(h => h)
        .map(h => h.trim())
    : []
  let newCustomHeaders = headers.filter(el => !existingHeadersArray.includes(el))
  if (newCustomHeaders.length > 0) {
    // Ensure proper format: existing headers should end with ":" and new headers should be separated by ": "
    // If existing headers exist and don't end with ":", add ": " before new headers
    // If existing headers end with ":", add " " before new headers
    let prefix = existingCustomHeaders
    if (existingCustomHeaders) {
      if (existingCustomHeaders.endsWith(':')) {
        prefix = existingCustomHeaders + ' '
      } else if (existingCustomHeaders.endsWith(': ')) {
        prefix = existingCustomHeaders
      } else {
        prefix = existingCustomHeaders + ': '
      }
    }
    newCustomHeaders = `${prefix}${newCustomHeaders.join(': ')}:`
    mailnews.setCharPref('.customHeaders', newCustomHeaders)
  }

  /**
   * PREF_INVALID	0	long
   * PREF_STRING	32	long data type.
   * PREF_INT	64	long data type.
   * PREF_BOOL	128	long data type.
   */
  // console.log(mailnews.getPrefType('.customDBHeaders'))
}
