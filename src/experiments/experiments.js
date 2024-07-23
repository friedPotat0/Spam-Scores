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
  'x-spam-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-report': /([-+]?[0-9]+\.?[0-9]*) hits,/,
  'x-rspamd-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-vr-spamscore': /([0-9]+)/
}

function importThreadPaneModule() {
  try {
    // TB115
    return ChromeUtils.importESModule("chrome://messenger/content/thread-pane-columns.mjs");
  } catch (err) {
    // TB128
    return ChromeUtils.importESModule("chrome://messenger/content/ThreadPaneColumns.mjs");
  }
}

var { ThreadPaneColumns } = importThreadPaneModule();

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2

let scoreHdrViewParams = {
  lowerScoreBounds: DEFAULT_SCORE_LOWER_BOUNDS,
  upperScoreBounds: DEFAULT_SCORE_UPPER_BOUNDS
}

function getScore(hdr) {
  for (const regExName in SCORE_REGEX) {
    const headerValue = hdr.getStringProperty(regExName)
    if (headerValue === '') continue
    const scoreField = headerValue.match(SCORE_REGEX[regExName])
    if (!scoreField) continue // If no match iterate - Note: This shouldn't be needed
    const score = parseFloat(scoreField[1])
    if (!isNaN(score)) return score
  }

  if (scoreHdrViewParams.customMailscannerHeaders) {
    for (const headerName of scoreHdrViewParams.customMailscannerHeaders) {
      for (const regExName in CUSTOM_SCORE_REGEX) {
        if (headerName.endsWith(regExName)) {
          const headerValue = hdr.getStringProperty(headerName)
          const scoreField = headerValue.match(CUSTOM_SCORE_REGEX[regExName])
          if (!scoreField) continue // If no match iterate
          const score = parseFloat(scoreField[1])
          if (!isNaN(score)) return score
        }
      }
    }
  }
  return null
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
          scoreHdrViewParams.lowerScoreBounds = lower
          scoreHdrViewParams.upperScoreBounds = upper
        },
        setHideIconScoreOptions(hidePositive, hideNeutral, hideNegative) {
          scoreHdrViewParams.hideIconScorePositive = hidePositive
          scoreHdrViewParams.hideIconScoreNeutral = hideNeutral
          scoreHdrViewParams.hideIconScoreNegative = hideNegative
        },
        setCustomMailscannerHeaders(customMailscannerHeaders) {
          scoreHdrViewParams.customMailscannerHeaders = customMailscannerHeaders
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
              return context.extension.baseURI.resolve(url);
            }
            return null;
          }
          function scoreCallback(msgHdr) {
            let score = getScore(msgHdr);
            if (score === null) return null;
            if (score > scoreHdrViewParams.upperScoreBounds && scoreHdrViewParams.hideIconScorePositive) return null;
            if (score <= scoreHdrViewParams.upperScoreBounds && score >= scoreHdrViewParams.lowerScoreBounds && scoreHdrViewParams.hideIconScoreNeutral) return null
            if (score < scoreHdrViewParams.lowerScoreBounds && scoreHdrViewParams.hideIconScoreNegative) return null;
            return score;
          }
          
          ThreadPaneColumns.addCustomColumn("spam-score-value", {
            name: nameSpamScoreValue,
            hidden: true,
            icon: false,
            resizable: true,
            sortable: true,
            textCallback: scoreCallback,
          });

          ThreadPaneColumns.addCustomColumn("spam-score-icon", {
            name: nameSpamScoreIcon,
            hidden: true,
            icon: true,
            iconHeaderUrl: getExtensionUrl("/images/icon-16px.png"),
            iconCellDefinitions: [
              {
                id: "positive",
                alt: "+",
                title: "Positive Spam Score",
                url: getExtensionUrl("/images/score_positive.png"),
              },
              {
                id: "negative",
                alt: "-",
                title: "Negative Spam Score",
                url: getExtensionUrl("/images/score_negative.png"),
              },
              {
                id: "neutral",
                alt: "0",
                title: "Neutral Spam Score",
                url: getExtensionUrl("/images/score_neutral.png"),
              }
            ],
            iconCallback: msgHdr => {
              let score = getScore(msgHdr);
              if (score === null) return ""
              if (!scoreHdrViewParams.hideIconScorePositive && score > scoreHdrViewParams.upperScoreBounds) return 'positive'
              if (!scoreHdrViewParams.hideIconScoreNeutral && score <= scoreHdrViewParams.upperScoreBounds && score >= scoreHdrViewParams.lowerScoreBounds) return 'neutral'
              if (!scoreHdrViewParams.hideIconScoreNegative && score < scoreHdrViewParams.lowerScoreBounds) return 'negative'
              return ""
            },
            resizable: false,
            sortable: true,
            textCallback: scoreCallback,
          });
        },

        async removeColumns(id) {
          ThreadPaneColumns.removeCustomColumn("spam-score-value");
          ThreadPaneColumns.removeCustomColumn("spam-score-icon");
        }
      }
    }
  }

  close() {
    ThreadPaneColumns.removeCustomColumn("spam-score-value");
    ThreadPaneColumns.removeCustomColumn("spam-score-icon");
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
    'x-spam-report'
  ]
  const headers = [...staticHeaders, ...dynamicHeaders]

  // customDBHeaders: String in the form of "header1 header2 header3"
  // Note: Do not overwrite headers of other add-ons or user-defined ones. Always append new headers!
  const existingCustomDBHeaders = Services.prefs.getCharPref('mailnews.customDBHeaders')
  let newCustomDBHeaders = headers.filter(el => !existingCustomDBHeaders.includes(el))
  if (newCustomDBHeaders.length > 0) {
    newCustomDBHeaders = `${existingCustomDBHeaders} ${newCustomDBHeaders.join(' ')}`
    mailnews.setCharPref('.customDBHeaders', newCustomDBHeaders)
  }

  // customHeaders: String in the form of "header1: header2: header3:"
  // Note: Do not overwrite headers of other add-ons or user-defined ones. Always append new headers!
  const existingCustomHeaders = Services.prefs.getCharPref('mailnews.customHeaders')
  let newCustomHeaders = headers.filter(el => !existingCustomHeaders.includes(`${el}:`))
  if (newCustomHeaders.length > 0) {
    newCustomHeaders = `${existingCustomHeaders} ${newCustomHeaders.join(': ')}:` // trailing colon for the last header in the list!
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
