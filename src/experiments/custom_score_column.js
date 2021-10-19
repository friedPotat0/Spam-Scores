/**
 * In experiment.js we use extension.getURL('src/experiments/custom_score_column.js')
 * When we load it is concatenated to the code so is not independent.
 * That would be a hassle for debugging...
 */

// Copy of constants.js until ES6
const CUSTOM_SCORE_REGEX = {
  'mailscanner-spamcheck':
    /(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),/
}

// Copy of constants.js until ES6
const SCORE_REGEX = {
  'x-spam-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-rspamd-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-vr-spamscore': /([0-9]+)/,
  'x-spamd-result': /\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];/,
  'x-spam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-report': /([-+]?[0-9]+\.?[0-9]*) hits,/
}

/**
 * We can't use log in this class, because it executes as a thread on each message
 * https://web.archive.org/web/20191010075908/https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_extensions/Creating_a_Custom_Column
 */
class ColumnHandler {
  constructor(gDBView, params) {
    this.gDBView = gDBView
    this.upperScoreBounds = params.upperScoreBounds
    this.lowerScoreBounds = params.lowerScoreBounds
    this.hideIconScorePositive = params.hideIconScorePositive || false
    this.hideIconScoreNeutral = params.hideIconScoreNeutral || false
    this.hideIconScoreNegative = params.hideIconScoreNegative || false
    this.customMailscannerHeaders = params.customMailscannerHeaders
  }

  getCellProperties(row, col, props) {
    const score = this.getScore(this.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > this.upperScoreBounds) {
      if (this.hideIconScorePositive) return null
      return 'positive'
    }
    if (score <= this.upperScoreBounds && score >= this.lowerScoreBounds) {
      if (this.hideIconScoreNeutral) return null
      return 'neutral'
    }
    if (score < this.lowerScoreBounds) {
      if (this.hideIconScoreNegative) return null
      return 'negative'
    }
  }

  /**
   * From what I understand, getScore executes when Thunderbird loads the Add-on
   *
   * - This part gets the score that is shown in Column SpamScores
   * @param {*} hdr Probably Headers? https://web.archive.org/web/20210601181130/https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgDBHdr
   *
   */
  getScore(hdr) {
    for (const regExName in SCORE_REGEX) {
      const headerValue = hdr.getStringProperty(regExName)
      if (headerValue === '') continue
      const scoreField = headerValue.match(SCORE_REGEX[regExName])
      if (!scoreField) continue // If no match iterate - Note: This shouldn't be needed
      const score = parseFloat(scoreField[1])
      if (!isNaN(score)) return score
      // return scoreInterpolation(regExName, scoreField[1])
    }

    if (this.customMailscannerHeaders) {
      for (const headerName of this.customMailscannerHeaders) {
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
  getCellText(row, col) {
    const score = this.getScore(this.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > this.upperScoreBounds && this.hideIconScorePositive) return null
    if (score <= this.upperScoreBounds && score >= this.lowerScoreBounds && this.hideIconScoreNeutral) return null
    if (score < this.lowerScoreBounds && this.hideIconScoreNegative) return null
    return ' ' + score
  }

  getSortStringForRow(hdr) {
    return this.getScore(hdr)
  }

  /**
   * 
   * @param {*} hdr 
   * @returns 
   */
  getSortLongForRow(hdr) {
    let score = this.getScore(hdr)
    // What is this for?
    if (score === null) return 999999
    return this.getScore(hdr) * 1e4 + 1e8
  }

  // My Little Graveyard
  isString() {
    return false
  }
  getRowProperties(row, props) {}
  getImageSrc(row, col) {}
}

class ColumnOverlay {
  constructor(gDBView, document, params) {
    this.gDBView = gDBView
    this.document = document
    this.columnId = 'spamscore'
    this.addColumn()
    this.columnHandler = new ColumnHandler(this.gDBView, params)
  }

  addColumn() {
    const columnId = this.columnId
    const doc = this.document
    if (doc.getElementById(this.columnId)) return
    const treeCol = doc.createXULElement('treecol')
    const threadCols = doc.getElementById('threadCols')

    treeCol.setAttribute('id', columnId)
    treeCol.setAttribute('persist', 'hidden ordinal sortDirection width')
    treeCol.setAttribute('flex', '2')
    treeCol.setAttribute('closemenu', 'none')
    treeCol.setAttribute('label', 'Spam score')
    treeCol.setAttribute('tooltiptext', 'Sort by spam score')

    threadCols.appendChild(treeCol)

    const attributes = Services.xulStore.getAttributeEnumerator(doc.URL, columnId)
    for (const attribute of attributes) {
      const value = Services.xulStore.getValue(doc.URL, columnId, attribute)
      if (attribute != 'ordinal' || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
        treeCol.setAttribute(attribute, value)
      } else {
        treeCol.ordinal = value
      }
    }
    Services.obs.addObserver(this, 'MsgCreateDBView', false)
  }

  observe(aMsgFolder, aTopic, aData) {
    try {
      this.gDBView.addColumnHandler(this.columnId, this.columnHandler)
    } catch (ex) {
      console.error(ex)
      throw new Error('Cannot add column handler')
    }
  }

  destroyColumn() {
    const treeCol = this.document.getElementById(this.columnId)
    if (!treeCol) return
    treeCol.remove()
    try {
      Services.obs.removeObserver(this, 'MsgCreateDBView')
    } catch (error) {
      if (error.name === 'NS_ERROR_ILLEGAL_VALUE') {
        console.log('This only happens when you reload the addon if a mail folder it is activated')
      } else {
        console.error(error)
      }
    }
  }
}

let columnOverlay

/**
 * TODO: When is not mail:3pane?
 * @param {*} gDBView 
 * @param {*} doc 
 * @param {*} params 
 */
function init(gDBView, doc, params) {
  if (gDBView && doc.documentElement.getAttribute('windowtype') == 'mail:3pane') {
    this.columnOverlay = new ColumnOverlay(gDBView, doc, params)
    Services.obs.notifyObservers(null, 'MsgCreateDBView')
  }
}

function destroy() {
  if (this.columnOverlay) {
    this.columnOverlay.destroyColumn()
    this.columnOverlay = undefined
  }
}
const styleSheetService = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(
  Components.interfaces.nsIStyleSheetService
)
const uri = Services.io.newURI(extension.getURL('src/experiments/custom_score_column.css'), null, null)
styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET)
