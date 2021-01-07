const SYMBOL_HEADER_REGEX = /(X-.*?(?:Spamd-Result|Spam-Report|SpamCheck|Spam-Status):.*(?:\r?\n(?:\t+ *| +).*)*)/g
const SYMBOL_PREFIX_REGEX = /\* +(-?[\d.]+)[ \)=]+([A-Z][A-Z0-9_]+)(?:(?:.|\r?\n)+?\[(.*?)\])?/g
const SYMBOL_SUFFIX_REGEX = /([A-Z][A-Z0-9_]+)(?:(?:[ \(=](-?[\d.]+)\)?(?:\[(.*?)\])?)|, *| )/g

browser.tabs
  .query({
    active: true,
    currentWindow: true
  })
  .then(async tabs => {
    let tabId = tabs[0].id
    browser.messageDisplay.getDisplayedMessage(tabId).then(async message => {
      const rawMessage = await browser.messages.getRaw(message.id)
      const rawHeader = rawMessage.split('\r\n\r\n')[0]
      let parsedDetailScores = getParsedDetailScores(rawHeader)
      if (parsedDetailScores) {
        let groupedDetailScores = {
          positive: parsedDetailScores.filter(el => el.score > 0).sort((a, b) => b.score - a.score),
          negative: parsedDetailScores.filter(el => el.score < 0).sort((a, b) => a.score - b.score),
          neutral: parsedDetailScores.filter(el => el.score === 0).sort((a, b) => a.name.localeCompare(b.name))
        }
        let scoreDetailElements =
          '<table class="score-details"><tr><th>Name</th><th>Score</th><th>Description</th></tr>'
        for (let groupType of ['positive', 'negative', 'neutral']) {
          scoreDetailElements += `
          ${groupedDetailScores[groupType]
            .map(el => {
              let symbol = rspamdSymbols.find(sym => sym.name === el.name)
              let element = `<tr class="score ${groupType}">`
              element += `<td><span>${el.name}</span></td>`
              element += `<td><span>${el.score}</span></td>`
              element += `<td><span>${
                symbol ? `${symbol.description}${el.info ? ` <span class="info">[${el.info}]</span>` : ''}` : ''
              }</span></td>`
              element += '</tr>'
              return element
            })
            .join('')}
        `
        }
        scoreDetailElements += '</table>'
        document.body.innerHTML = `
        ${scoreDetailElements}
      `
      } else {
        document.body.innerHTML = '<h5>No details available</h5>'
      }
    })
  })

function getParsedDetailScores(rawHeader) {
  let spamHeaderMatch = rawHeader.match(SYMBOL_HEADER_REGEX)
  if (spamHeaderMatch && spamHeaderMatch.length > 0) {
    for (let spamHeader of spamHeaderMatch) {
      let symbolMatch = spamHeader.match(SYMBOL_PREFIX_REGEX)
      if (symbolMatch && symbolMatch.length > 0) {
        return symbolMatch.map(el => ({
          name: el.replace(SYMBOL_PREFIX_REGEX, '$2'),
          score: parseFloat(el.replace(SYMBOL_PREFIX_REGEX, '$1') || 0),
          info: el.replace(SYMBOL_PREFIX_REGEX, '$3') || ''
        }))
      }
      symbolMatch = spamHeader.match(SYMBOL_SUFFIX_REGEX)
      if (symbolMatch && symbolMatch.length > 0) {
        return symbolMatch.map(el => ({
          name: el.replace(SYMBOL_SUFFIX_REGEX, '$1'),
          score: parseFloat(el.replace(SYMBOL_SUFFIX_REGEX, '$2') || 0),
          info: el.replace(SYMBOL_SUFFIX_REGEX, '$3') || ''
        }))
      }
    }
  }
  return null
}
