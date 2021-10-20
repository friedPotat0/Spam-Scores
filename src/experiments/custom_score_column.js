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
 * nsIMsgCustomColumnHandler
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
    this.scores = {}
  }

  /**
   * From what I understand, getScore executes when Thunderbird loads the Add-on
   *
   * - This part gets the score that is shown in Column SpamScores
   * https://web.archive.org/web/20210601181130/https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgDBHdr
   * @param {nsIMsgDBHdr} hdr Probably Headers?
   * @returns {number|null} Score value
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

  /**
   * dlh2: Called First on Load Cell
   * The image path for a given cell.
   * @param {Number} row The index of the row.
   * @param {nsITreeColumn} col The index of the column.
   * @returns {string|null} The image path of the cell.
   */
  getImageSrc(row, col) {
    const score = this.getScore(this.gDBView.getMsgHdrAt(row))
    // Save it so getCellText doesn't need to recalculate
    this.scores[row] = score
    if (score === null) return null
    if (score > this.upperScoreBounds) {
      if (this.hideIconScorePositive) return null
      return extension.getURL('images/score_positive.png')
    }
    if (score <= this.upperScoreBounds && score >= this.lowerScoreBounds) {
      if (this.hideIconScoreNeutral) return null
      return extension.getURL('images/score_neutral.png')
    }
    if (score < this.lowerScoreBounds) {
      if (this.hideIconScoreNegative) return null
      return extension.getURL('images/score_negative.png')
    }
  }

  /**
   * dlh2: Called Second on Load Cell
   * The text for a given cell. If a column consists only of an image, then the empty string is returned.
   * @param {Number} row The index of the row.
   * @param {nsITreeColumn} col The column of the cell. (Note that this is not the column index.)
   * @returns {string} The text of the cell.
   */
  getCellText(row, col) {
    const score = this.scores[row]
    if (score === null) return null
    if (score > this.upperScoreBounds && this.hideIconScorePositive) return null
    if (score <= this.upperScoreBounds && score >= this.lowerScoreBounds && this.hideIconScoreNeutral) return null
    if (score < this.lowerScoreBounds && this.hideIconScoreNegative) return null
    return ' ' + score
  }

  /**
   * dlh2: Called First on Load Column on each Cell if the column its "Sort Activated"
   * If the column displays a number, this will return the number that the column should be sorted by.
   * @param {nsIMsgDBHdr} hdr
   * @returns {Number} The value that sorting will be done with.
   */
  getSortLongForRow(hdr) {
    const score = this.getScore(hdr)
    // Mail without spam score should be put down
    if (score === null) return 0
    // The reason behind this is that the sorting doesn't take into account
    // negative numbers and decimals
    return score * 1e4 + 1e8
  }

  /**
   * This affects whether getSortStringForRow or getSortLongForRow is used
   * to determine the sort key for the column. It does not affect whether
   * getCellText vs. getImageSrc is used to determine what to display.
   * @returns {boolean} true if the column displays a string value. false otherwise.
   */
  isString() {
    return false
  }
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
    // Recommended Width
    treeCol.setAttribute('width', '82')

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
