var { AppConstants } = ChromeUtils.import('resource://gre/modules/AppConstants.jsm')
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')

class ColumnHandler {
  init(win) {
    this.win = win
  }

  isString() {
    return false
  }
  getCellProperties(row, col, props) {}
  getRowProperties(row, props) {}
  async getImageSrc(row, col) {
    let score = this.getScore(this.win.gDBView.getMsgHdrAt(row))
    if (score === null) return null
    if (score > 2) return extension.rootURI.resolve('./images/score_positive.png')
    if (score <= 2 && score >= -2) return extension.rootURI.resolve('./images/score_neutral.png')
    if (score < -2) return extension.rootURI.resolve('./images/score_negative.png')
  }
  getScore(hdr) {
    let score =
      hdr.getStringProperty('x-spamd-result').replace(/^default.*\[(.*) \/ .*\];.*$/gi, '$1') ||
      hdr.getStringProperty('x-spam-score') ||
      hdr.getStringProperty('x-spam-status').replace(/.*score=(.*?) .*$/gi, '$1')
    if (score) return parseFloat(score)
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
  init(win) {
    this.win = win
    this.columnId = 'spamscore'
    this.addColumn(win)
    this.columnHandler = new ColumnHandler()
  }

  destroy() {
    this.destroyColumn()
  }

  observe(aMsgFolder, aTopic, aData) {
    try {
      this.columnHandler.init(this.win)
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
  init(win) {
    this.win = win
    this.columnOverlay = new ColumnOverlay()
    this.columnOverlay.init(win)
    if (win.gDBView && win.document.documentElement.getAttribute('windowtype') == 'mail:3pane') {
      Services.obs.notifyObservers(null, 'MsgCreateDBView')
    }
  }
  destroy() {
    this.columnOverlay.destroy()
  }
}

var SpamScores_ScoreHdrView = new SpamScores_ScoreHdrViewColumn()
