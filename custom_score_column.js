var { AppConstants } = ChromeUtils.import('resource://gre/modules/AppConstants.jsm')
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')

const DEFAULT_SCORE_LOWER_BOUNDS = -2.0
const DEFAULT_SCORE_UPPER_BOUNDS = 2.0
const SCORE_REGEX = {
  spamdResult: /.*\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];.*/is,
  spamScore: /([-+]?[0-9]+\.?[0-9]*).*/is,
  spamStatus: /.*score=([-+]?[0-9]+\.?[0-9]*) .*/is,
  mailscannerSpamcheck: /.*(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),.*/is
}

class ColumnHandler {
  init(win, params) {
    this.win = win
    this.params = params
  }

  isString() {
    return false
  }
  getCellProperties(row, col, props) {}
  getRowProperties(row, props) {}
  getImageSrc(row, col) {
    let score = this.getScore(this.win.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > this.params.upperScoreBounds) return extension.rootURI.resolve('./images/score_positive.png')
    if (score <= this.params.upperScoreBounds && score >= this.params.lowerScoreBounds)
      return extension.rootURI.resolve('./images/score_neutral.png')
    if (score < this.params.lowerScoreBounds) return extension.rootURI.resolve('./images/score_negative.png')
  }
  getScore(hdr) {
    let score = null
    if (SCORE_REGEX.spamdResult.test(hdr.getStringProperty('x-spamd-result'))) {
      score = hdr.getStringProperty('x-spamd-result').replace(SCORE_REGEX.spamdResult, '$1')
    }
    if (!score && SCORE_REGEX.spamScore.test(hdr.getStringProperty('x-spam-score'))) {
      score = hdr.getStringProperty('x-spam-score').replace(SCORE_REGEX.spamScore, '$1')
    }
    if (!score && SCORE_REGEX.spamStatus.test(hdr.getStringProperty('x-spam-status'))) {
      score = hdr.getStringProperty('x-spam-status').replace(SCORE_REGEX.spamStatus, '$1')
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
    let score = this.getScore(this.win.gDBView.getMsgHdrAt(row))
    return score !== null ? ' ' + score : null
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
    for (let attribute of attributes) {
      let value = Services.xulStore.getValue(this.win.document.URL, this.columnId, attribute)
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

var SpamScores_ScoreHdrView = new SpamScores_ScoreHdrViewColumn()
