'use strict'
const EXTENSION_NAME = 'spamscores@czaenker'
const extension = WebExtensionPolicy.getByID(EXTENSION_NAME).extension

/** 
 * This is going to be deprecated anytime.
 * @type {DestructuredExtensionSupport} 
 */ 
const { ExtensionSupport } = Cu.import('resource:///modules/ExtensionSupport.jsm')

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

  /**
   *
   * @param {*} context
   * @returns
   */
  getAPI(context) {
    // log(Object.keys(context)) // Does callOnClose Exist?
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
 * Paint
 * @param {Window} win Literally Window
 */
function paint(win) {
  // Basically we create a object of SpamScores
  win.SpamScores = {}
  // Then Load the Custom Script into it
  // https://developer.thunderbird.net/add-ons/mailextensions/experiments#structuring-experiment-code
  Services.scriptloader.loadSubScript(extension.rootURI.resolve('src/experiments/custom_score_column.js'), win.SpamScores)
  // So we can save it and destroy it in unpaint?
  win.SpamScores.SpamScores_ScoreHdrView.init(win, scoreHdrViewParams)
}

/**
 * Unpaint
 * @param {Window} win
 */
function unpaint(win) {
  win.SpamScores.SpamScores_ScoreHdrView.destroy()
  delete win.SpamScores
}

// Logger
function log(msg, line = '?') {
  Services.wm.getMostRecentWindow('mail:3pane').alert('[Line ' + line + '] :' + msg)
}