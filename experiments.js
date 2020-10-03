'use strict'
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')
var { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm')
var { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm')
var { MailServices } = ChromeUtils.import('resource:///modules/MailServices.jsm')

const EXTENSION_NAME = 'spamscores@czaenker'
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME)

var SpamScores = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    if (isAppShutdown) return
    Services.obs.notifyObservers(null, 'startupcache-invalidate')
  }

  onStartup() {
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
  win.SpamScores.SpamScores_ScoreHdrView.init(win)
}

function unpaint(win) {
  win.SpamScores.SpamScores_ScoreHdrView.destroy()
  delete win.SpamScores
}
