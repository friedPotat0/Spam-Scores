'use strict'
// Libs
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')
const { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm')
const { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm')
const { MailServices } = ChromeUtils.import('resource:///modules/MailServices.jsm')

const EXTENSION_NAME = 'spamscores@czaenker'
const extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME)

// Doesn't work with ES6
// const { DEFAULT_SCORE_LOWER_BOUNDS, DEFAULT_SCORE_UPPER_BOUNDS } = ChromeUtils.import(extension.getURL("src/constants.jsm"));

const custom_score_column = extension.getURL('src/experiments/custom_score_column.js')
const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2
let scoreHdrViewParams = {
  lowerScoreBounds: DEFAULT_SCORE_LOWER_BOUNDS,
  upperScoreBounds: DEFAULT_SCORE_UPPER_BOUNDS
}

/**
 * Do not change var
 * https://webextension-api.thunderbird.net/en/91/how-to/experiments.html#implementing-functions
 */
var SpamScores = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    if (isAppShutdown) return
    Services.obs.notifyObservers(null, 'startupcache-invalidate')
  }

  onStartup() {
    updatePrefs()
    Services.console.logStringMessage('Spam Scores startup completed')
  }

  getAPI(context) {
    context.callOnClose(this)
    // All functions should be added in schema.json
    return {
      SpamScores: {
        addWindowListener(dummy) {
          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ['chrome://messenger/content/messenger.xul', 'chrome://messenger/content/messenger.xhtml'],
            onLoadWindow: paint,
            onUnloadWindow: unpaint
          })
        },
        setScoreBounds(lower, upper) {
          scoreHdrViewParams.lowerScoreBounds = lower
          scoreHdrViewParams.upperScoreBounds = upper
        },
        setHideIconScoreOptions(hidePositive, hideNeutral, hideNegative) {
          scoreHdrViewParams.hideIconScorePositive = hidePositive
          scoreHdrViewParams.hideIconScoreNeutral = hideNeutral
          scoreHdrViewParams.hideIconScoreNegative = hideNegative
        },
        getHelloFlag() {
          try {
            return Services.prefs.getBoolPref('spamscores.hello')
          } catch (err) {
            return false
          }
        },
        setHelloFlag() {
          Services.prefs.setBoolPref('spamscores.hello', true)
        },
        addDynamicCustomHeaders(dynamicHeaders) {
          updatePrefs(dynamicHeaders)
        },
        setCustomMailscannerHeaders(customMailscannerHeaders) {
          scoreHdrViewParams.customMailscannerHeaders = customMailscannerHeaders
        }
      }
    }
  }

  close() {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME)
    for (const win of Services.wm.getEnumerator('mail:3pane')) {
      unpaint(win)
    }
  }
}

/**
 *
 * @param {*} win
 */
function paint(win) {
  win.SpamScores = {}
  Services.scriptloader.loadSubScript(custom_score_column, win.SpamScores)
  win.SpamScores.SpamScores_ScoreHdrView.init(win, scoreHdrViewParams)
}

/**
 *
 * @param {*} win
 */
function unpaint(win) {
  win.SpamScores.SpamScores_ScoreHdrView.destroy()
  delete win.SpamScores
}

/**
 *
 * @param {*} dynamicHeaders
 */
function updatePrefs(dynamicHeaders = []) {
  const staticHeaders = ['x-spam-status', 'x-spamd-result', 'x-spam-score', 'x-rspamd-score', 'x-spam-report']
  const prefs = Services.prefs
  const customDBHeaders = prefs.getCharPref('mailnews.customDBHeaders')
  const customHeaders = prefs.getCharPref('mailnews.customHeaders')

  let newCustomDBHeaders = customDBHeaders
  let newCustomHeaders = customHeaders

  for (const header of staticHeaders) {
    if (customDBHeaders.indexOf(header) === -1) newCustomDBHeaders += ` ${header}`
    if (customHeaders.indexOf(`${header}:`) === -1) newCustomHeaders += ` ${header}:`
  }
  for (const header of dynamicHeaders) {
    if (customDBHeaders.indexOf(header) === -1) newCustomDBHeaders += ` ${header}`
    if (customHeaders.indexOf(`${header}:`) === -1) newCustomHeaders += ` ${header}:`
  }

  prefs.getBranch('mailnews').setCharPref('.customDBHeaders', newCustomDBHeaders.trim())
  prefs.getBranch('mailnews').setCharPref('.customHeaders', newCustomHeaders.trim())
}
