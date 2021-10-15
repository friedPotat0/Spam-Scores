/**
 * In experiment.js we use extension.getURL('src/experiments/custom_score_column.js')
 * When we load it is concatenated to the code so is not independent.
 * That would be a hassle for debugging...
 */

const SCORE_REGEX = {
  spamdResult: /.*\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];.*/is,
  spamScore: /([-+]?[0-9]+\.?[0-9]*).*/is,
  spamStatus: /.*(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*).*/is,
  spamReport: /.*?([-+]?[0-9]+\.?[0-9]*) hits, .*/is,
  rspamdScore: /([-+]?[0-9]+\.?[0-9]*).*/is,
  mailscannerSpamcheck:
    /.*(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),.*/is,
  vrScore: /([0-9]+).*/is
}
class ColumnHandler {
  init(win, params) {
    this.win = win
    this.params = params
  }

  isString() {
    return false
  }
  getCellProperties(row, col, props) {
    const upperScoreBounds = this.params.upperScoreBounds
    const lowerScoreBounds = this.params.lowerScoreBounds
    const score = this.getScore(this.win.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > upperScoreBounds) {
      if (this.params.hideIconScorePositive === true) return null
      return 'positive'
    }
    if (score <= upperScoreBounds && score >= lowerScoreBounds) {
      if (this.params.hideIconScoreNeutral === true) return null
      return 'neutral'
    }
    if (score < lowerScoreBounds) {
      if (this.params.hideIconScoreNegative === true) return null
      return 'negative'
    }
  }
  getRowProperties(row, props) {}
  getImageSrc(row, col) {}
  /**
   * dlh2 TODO: We... redo the work that we already did in background? We stupid
   * 
   * - This part gets the score that is shown in Column SpamScores
   * @param {*} hdr Probably Headers?
   * @returns 
   */
  getScore(hdr) {
    let score = null
    if (SCORE_REGEX.spamdResult.test(hdr.getStringProperty('x-spamd-result'))) {
      score = hdr.getStringProperty('x-spamd-result').replace(SCORE_REGEX.spamdResult, '$1')
    }
    if (!score && SCORE_REGEX.spamStatus.test(hdr.getStringProperty('x-spam-status'))) {
      score = hdr.getStringProperty('x-spam-status').replace(SCORE_REGEX.spamStatus, '$1')
    }
    if (!score && SCORE_REGEX.spamScore.test(hdr.getStringProperty('x-spam-score'))) {
      score = hdr.getStringProperty('x-spam-score').replace(SCORE_REGEX.spamScore, '$1')
    }
    if (!score && SCORE_REGEX.spamReport.test(hdr.getStringProperty('x-spam-report'))) {
      score = hdr.getStringProperty('x-spam-report').replace(SCORE_REGEX.spamReport, '$1')
    }
    if (!score && SCORE_REGEX.rspamdScore.test(hdr.getStringProperty('x-rspamd-score'))) {
      score = hdr.getStringProperty('x-rspamd-score').replace(SCORE_REGEX.rspamdScore, '$1')
    }
    if (!score && SCORE_REGEX.vrScore.test(hdr.getStringProperty('x-vr-spamscore'))) {
      score = hdr.getStringProperty('x-vr-spamscore').replace(SCORE_REGEX.vrScore, '$1')
    }
    if (!score && this.params.customMailscannerHeaders) {
      for (let header of this.params.customMailscannerHeaders) {
        let headerScore = hdr.getStringProperty(header).replace(SCORE_REGEX.mailscannerSpamcheck, '$1')
        if (!isNaN(parseFloat(headerScore))) {
          score = headerScore
          break
        }
      }
    }
    if (score && !isNaN(parseFloat(score))) return parseFloat(score)
    return null
  }
  getCellText(row, col) {
    const upperScoreBounds = this.params.upperScoreBounds
    const lowerScoreBounds = this.params.lowerScoreBounds
    const score = this.getScore(this.win.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > upperScoreBounds) {
      if (this.params.hideIconScorePositive === true) return null
      return ' ' + score
    }
    if (score <= upperScoreBounds && score >= lowerScoreBounds) {
      if (this.params.hideIconScoreNeutral === true) return null
      return ' ' + score
    }
    if (score < lowerScoreBounds) {
      if (this.params.hideIconScoreNegative === true) return null
      return ' ' + score
    }
  }
  getSortStringForRow(hdr) {
    return this.getScore(hdr)
  }
  getSortLongForRow(hdr) {
    let score = this.getScore(hdr)
    if (score === null) return 999999
    return this.getScore(hdr) * 1e4 + 1e8
  }
}

class ColumnOverlay {
  init(win, params) {
    this.win = win
    this.params = params
    this.columnId = 'spamscore'
    this.addColumn(win)
    this.columnHandler = new ColumnHandler()
  }

  destroy() {
    this.destroyColumn()
  }

  observe(aMsgFolder, aTopic, aData) {
    try {
      this.columnHandler.init(this.win, this.params)
      this.win.gDBView.addColumnHandler(this.columnId, this.columnHandler)
    } catch (ex) {
      console.error(ex)
      throw new Error('Cannot add column handler')
    }
  }

  /**
   * dlh2 TODO: this.win = win?
   * @param {*} win
   * @returns
   */
  addColumn(win) {
    if (win.document.getElementById(this.columnId)) return

    const treeCol = win.document.createXULElement('treecol')
    treeCol.setAttribute('id', this.columnId)
    treeCol.setAttribute('persist', 'hidden ordinal sortDirection width')
    treeCol.setAttribute('flex', '2')
    treeCol.setAttribute('closemenu', 'none')

    treeCol.setAttribute('label', 'Spam score')
    treeCol.setAttribute('tooltiptext', 'Sort by spam score')

    const threadCols = win.document.getElementById('threadCols')
    threadCols.appendChild(treeCol)
    let attributes = Services.xulStore.getAttributeEnumerator(this.win.document.URL, this.columnId)
    for (const attribute of attributes) {
      const value = Services.xulStore.getValue(this.win.document.URL, this.columnId, attribute)
      if (attribute != 'ordinal' || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
        treeCol.setAttribute(attribute, value)
      } else {
        treeCol.ordinal = value
      }
    }
    Services.obs.addObserver(this, 'MsgCreateDBView', false)
  }

  destroyColumn() {
    const treeCol = this.win.document.getElementById(this.columnId)
    if (!treeCol) return
    treeCol.remove()
    Services.obs.removeObserver(this, 'MsgCreateDBView')
  }
}

class SpamScores_ScoreHdrViewColumn {
  init(win, params) {
    this.win = win
    this.params = params
    this.columnOverlay = new ColumnOverlay()
    this.columnOverlay.init(win, params)
    if (win.gDBView && win.document.documentElement.getAttribute('windowtype') == 'mail:3pane') {
      Services.obs.notifyObservers(null, 'MsgCreateDBView')
    }
  }
  destroy() {
    this.columnOverlay.destroy()
  }
}

// dlh2 TODO: Hm... I suppose this one is special
var SpamScores_ScoreHdrView = new SpamScores_ScoreHdrViewColumn()

const styleSheetService = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(
  Components.interfaces.nsIStyleSheetService
)
const uri = Services.io.newURI(extension.getURL('src/experiments/custom_score_column.css'), null, null)
styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET)
