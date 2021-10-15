'use strict'
// Libs
function log(msg, line = '?') {
  Services.wm.getMostRecentWindow('mail:3pane').alert('[Line ' + line + '] :' + msg)
}
/** @type {DestructuredExtensionSupport} */
const { ExtensionSupport } = Cu.import('resource:///modules/ExtensionSupport.jsm')

/** @type {DestructuredExtensionParent} */
const { ExtensionParent } = Cu.import('resource://gre/modules/ExtensionParent.jsm')

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
var SpamScores = class extends ExtensionAPI {
  /**
   * Called on Startup
   * dlh2 - When reloading it also happens
   */
  onStartup() {}

  /**
   * This function is called if the extension is disabled or removed, or Thunderbird closes.
   * We usually do not have to do any cleanup, if Thunderbird is shutting down entirely.
   * dlh2 - When reloading it also happens
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
