'use strict'
const EXTENSION_NAME = 'spamscores@czaenker'
const extension = WebExtensionPolicy.getByID(EXTENSION_NAME).extension

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2
let scoreHdrViewParams = {
  lowerScoreBounds: DEFAULT_SCORE_LOWER_BOUNDS,
  upperScoreBounds: DEFAULT_SCORE_UPPER_BOUNDS
}

/**
 * For debugging Experiments.js, press CTRL + SHIFT + U/I
 */

const experiments = {
  hdrView: {}
}
// Then Load the Custom Script into it
// https://developer.thunderbird.net/add-ons/mailextensions/experiments#structuring-experiment-code
Services.scriptloader.loadSubScript(
  extension.rootURI.resolve('src/experiments/custom_score_column.js'),
  experiments.hdrView
)

/**
 * Do not change var because it's a Global Class
 * https://webextension-api.thunderbird.net/en/91/how-to/experiments.html#implementing-functions
 */
var SpamScores = class extends ExtensionAPI {
  /**
   * Called on Startup
   * dlh2 - When reloading it also happens
   */
  onStartup() {
    updatePrefs()
  }

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
        addDynamicCustomHeaders(dynamicHeaders) {
          updatePrefs(dynamicHeaders)
        },
        repaint(windowId) {
          // Get a real window from a window ID:
          const windowObject = context.extension.windowManager.get(windowId)
          unpaint()
          paint(windowObject.window)
        },
        clear() {
          unpaint()
        }
      }
    }
  }

  close() {}
}

/**
 * Paint
 * @param {Window} win Literally Window
 */
function paint(win) {
  experiments.hdrView.init(win.gDBView, win.document, scoreHdrViewParams)
}

/**
 * Unpaint
 * @param {Window} win
 */
function unpaint() {
  if (experiments.hdrView) experiments.hdrView.destroy()
}

/**
 * This is what it lets nsIMsgDBHdr have the properties of the headers
 * http://kb.mozillazine.org/Mail_and_news_settings // 2019
 * http://udn.realityripple.com/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPrefBranch
 * https://searchfox.org/comm-central/source/mailnews/mailnews.js // 2021
 * Requeriments: Repair Folders then Restart
 * @param {string[]} dynamicHeaders
 */
function updatePrefs(dynamicHeaders = []) {
  const mailnews = Services.prefs.getBranch('mailnews')
  // Copy of constants.js until ES6
  const staticHeaders = [
    'x-spam-score',
    'x-rspamd-score',
    'x-vr-spamscore',
    'x-spamd-result',
    'x-spam-status',
    'x-spam-report'
  ]
  const headers = [...staticHeaders, ...dynamicHeaders]
  const customDBHeaders = headers.join(' ').trim()
  const customHeaders = headers.join(': ').trim()
  mailnews.setCharPref('.customDBHeaders', customDBHeaders)
  mailnews.setCharPref('.customHeaders', customHeaders)

  /**
   * PREF_INVALID	0	long
   * PREF_STRING	32	long data type.
   * PREF_INT	64	long data type.
   * PREF_BOOL	128	long data type.
   */
  // console.log(mailnews.getPrefType('.customDBHeaders'))
}
