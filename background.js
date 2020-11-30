'use strict'

const DEFAULT_SCORE_LOWER_BOUNDS = -2
const DEFAULT_SCORE_UPPER_BOUNDS = 2
const SCORE_REGEX = {
  spamdResult: /.*x-spamd-result: .*\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];.*/is,
  spamScore: /.*x-spam-score: ([-+]?[0-9]+\.?[0-9]*).*/is,
  spamStatus: /.*x-spam-status: .*score=([-+]?[0-9]+\.?[0-9]*) .*/is,
  mailscannerSpamcheck: /.*mailscanner-spamcheck: .*(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),.*/is
}

var init = async () => {
  browser.SpamScores.addWindowListener('none')
  browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    const rawMessage = await browser.messages.getRaw(message.id)
    const rawHeader = rawMessage.split('\r\n\r\n')[0]
    let score = getScore(rawHeader)
    if (score === null) {
      browser.messageDisplayAction.disable(tab.id)
    } else {
      browser.messageDisplayAction.enable(tab.id)
      browser.messageDisplayAction.setTitle({ tabId: tab.id, title: 'Spam Score: ' + score })
      browser.messageDisplayAction.setIcon({ path: await getImageSrc(score) })
    }

    if (SCORE_REGEX.mailscannerSpamcheck.test(rawHeader)) {
      let header = rawHeader.replace(/.*(x-.*?mailscanner-spamcheck):.*/is, '$1').toLowerCase()
      let storage = await browser.storage.local.get(['customMailscannerHeaders'])
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

function getScore(rawHeader) {
  if (SCORE_REGEX.spamdResult.test(rawHeader)) {
    return rawHeader.replace(SCORE_REGEX.spamdResult, '$1')
  }
  if (SCORE_REGEX.spamScore.test(rawHeader)) {
    return rawHeader.replace(SCORE_REGEX.spamScore, '$1')
  }
  if (SCORE_REGEX.spamStatus.test(rawHeader)) {
    return rawHeader.replace(SCORE_REGEX.spamStatus, '$1')
  }
  if (SCORE_REGEX.mailscannerSpamcheck.test(rawHeader)) {
    return rawHeader.replace(SCORE_REGEX.mailscannerSpamcheck, '$1')
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
