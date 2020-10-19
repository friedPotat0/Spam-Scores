'use strict'

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2

var init = async () => {
  browser.SpamScores.addWindowListener('none')
  browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    let rawMessage = await browser.messages.getRaw(message.id)
    let score = getScore(rawMessage)
    if (score === null) {
      browser.messageDisplayAction.disable(tab.id)
    } else {
      browser.messageDisplayAction.enable(tab.id)
      browser.messageDisplayAction.setTitle({ tabId: tab.id, title: 'Spam Score: ' + score })
      browser.messageDisplayAction.setIcon({ path: await getImageSrc(score) })
    }
    if (rawMessage.toLowerCase().indexOf('mailscanner-spamscore') !== -1) {
      let header = rawMessage.replace(/.*(x-.*?mailscanner-spamcheck):.*/gis, '$1').toLowerCase()
      let storage = await browser.storage.local.get(['customMailscannerHeaders'])
      console.log(storage)
      if (
        storage &&
        (!storage.customMailscannerHeaders ||
          (storage.customMailscannerHeaders && storage.customMailscannerHeaders.indexOf(header) === -1))
      ) {
        await browser.SpamScores.addDynamicCustomHeaders([header])
        browser.storage.local.set({
          customMailscannerHeaders: [...(storage.customMailscannerHeaders || []), header]
        })
      }
    }
  })

  if (!(await browser.SpamScores.getHelloFlag())) {
    messenger.windows.create({
      height: 680,
      width: 488,
      url: '/hello.html',
      type: 'popup'
    })
    browser.SpamScores.setHelloFlag()
  }

  let storage = await browser.storage.local.get([
    'scoreIconLowerBounds',
    'scoreIconUpperBounds',
    'customMailscannerHeaders'
  ])
  let lowerBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  )
  let upperBounds = parseFloat(
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS
  )
  browser.SpamScores.setScoreBounds(parseFloat(lowerBounds), parseFloat(upperBounds))

  if (storage && storage.customMailscannerHeaders) {
    browser.SpamScores.setCustomMailscannerHeaders(storage.customMailscannerHeaders)
  }
}
init()

function getScore(raw) {
  let match = raw.match(/x-spamd-result: .*/gi)
  if (match && match.length > 0) {
    return match[0].replace(/^x-spamd-result: .*\[(.*) \/ .*\];.*$/gi, '$1')
  }
  match = raw.match(/x-spam-score: .*/gi)
  if (match && match.length > 0) {
    return match[0].replace(/^x-spam-score: (.*)$/gi, '$1')
  }
  match = raw.match(/x-spam-status: .*/gi)
  if (match && match.length > 0) {
    return match[0].replace(/^x-spam-status: .*score=(.*?) .*$/gi, '$1')
  }
  match = raw.match(/x-.*?mailscanner-spamcheck: .*/gi)
  if (match && match.length > 0) {
    return match[0].replace(/^x-.*?mailscanner-spamcheck: .*score=(.*),$/gi, '$1')
  }
  return null
}

async function getImageSrc(score) {
  let storage = await browser.storage.local.get(['scoreIconLowerBounds', 'scoreIconUpperBounds'])
  let lowerBounds =
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconLowerBounds : DEFAULT_SCORE_LOWER_BOUNDS
  let upperBounds =
    storage && storage.scoreIconLowerBounds !== undefined ? storage.scoreIconUpperBounds : DEFAULT_SCORE_UPPER_BOUNDS

  if (score > upperBounds) return './images/score_positive.png'
  if (score <= upperBounds && score >= lowerBounds) return './images/score_neutral.png'
  if (score < lowerBounds) return './images/score_negative.png'
  return './images/score_neutral.png'
}
