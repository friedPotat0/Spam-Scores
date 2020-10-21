'use strict'
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')
var { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm')
var { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm')
var { MailServices } = ChromeUtils.import('resource:///modules/MailServices.jsm')

const EXTENSION_NAME = 'spamscores@czaenker'
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME)

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2

var scoreHdrViewParams = {
  lowerScoreBounds: DEFAULT_SCORE_LOWER_BOUNDS,
  upperScoreBounds: DEFAULT_SCORE_UPPER_BOUNDS
}

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
    for (let win of Services.wm.getEnumerator('mail:3pane')) {
      unpaint(win)
    }
  }
}

function paint(win) {
  win.SpamScores = {}
  Services.scriptloader.loadSubScript(extension.getURL('custom_score_column.js'), win.SpamScores)
  win.SpamScores.SpamScores_ScoreHdrView.init(win, scoreHdrViewParams)
}

function unpaint(win) {
  win.SpamScores.SpamScores_ScoreHdrView.destroy()
  delete win.SpamScores
}

function updatePrefs(dynamicHeaders = []) {
  let staticHeaders = ['x-spam-status', 'x-spamd-result', 'x-spam-score', 'x-rspamd-score']
  let customDBHeaders = Services.prefs.getCharPref('mailnews.customDBHeaders')
  let newCustomDBHeaders = customDBHeaders
  for (let header of staticHeaders) {
    if (customDBHeaders.indexOf(header) === -1) newCustomDBHeaders += ` ${header}`
  }
  for (let header of dynamicHeaders) {
    if (customDBHeaders.indexOf(header) === -1) newCustomDBHeaders += ` ${header}`
  }
  Services.prefs.getBranch('mailnews').setCharPref('.customDBHeaders', newCustomDBHeaders.trim())
  let customHeaders = Services.prefs.getCharPref('mailnews.customHeaders')
  let newCustomHeaders = customHeaders
  for (let header of staticHeaders) {
    if (customHeaders.indexOf(`${header}:`) === -1) newCustomHeaders += ` ${header}:`
  }
  for (let header of dynamicHeaders) {
    if (customHeaders.indexOf(`${header}:`) === -1) newCustomHeaders += ` ${header}:`
  }
  Services.prefs.getBranch('mailnews').setCharPref('.customHeaders', newCustomHeaders.trim())
}
