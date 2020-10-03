browser.tabs
  .query({
    active: true,
    currentWindow: true
  })
  .then(async tabs => {
    let tabId = tabs[0].id
    browser.messageDisplay.getDisplayedMessage(tabId).then(async message => {
      let rawMessage = await browser.messages.getRaw(message.id)
      let parsedDetailScores = getParsedDetailScores(rawMessage)
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

function getParsedDetailScores(raw) {
  let spamdResultRegex = /([A-Z0-9_]+)\((-?\d+\.\d+)\)\[(.*?)\];?/g
  let match = raw.match(spamdResultRegex)
  if (match && match.length > 0) {
    return match.map(el => ({
      name: el.replace(spamdResultRegex, '$1'),
      score: parseFloat(el.replace(spamdResultRegex, '$2')),
      info: el.replace(spamdResultRegex, '$3') || ''
    }))
  }
  let spamStatusRegex = /([A-Z0-9_]+)=(-?[\d.]+)[,\]]/g
  match = raw.match(/x-spam-status: .*tests=\[.*?\]/gis)
  if (match && match.length > 0) {
    return match[0].match(spamStatusRegex).map(el => ({
      name: el.replace(spamStatusRegex, '$1'),
      score: parseFloat(el.replace(spamStatusRegex, '$2')),
      info: ''
    }))
  }
  let spamStatusAltRegex = /\* +(-?[\d.]+) ([A-Z0-9_]+)/gs
  match = raw.match(spamStatusAltRegex)
  if (match && match.length > 0) {
    return match.map(el => ({
      name: el.replace(spamStatusAltRegex, '$2'),
      score: parseFloat(el.replace(spamStatusAltRegex, '$1')),
      info: ''
    }))
  }
  return null
}
