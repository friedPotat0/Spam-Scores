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
  })
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
