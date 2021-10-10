/** @constant {number} */
export const DEFAULT_SCORE_LOWER_BOUNDS = -2.0

/** @constant {number} */
export const DEFAULT_SCORE_UPPER_BOUNDS = 2.0

/** @constant {Object<RegExp>} */
export const SCORE_REGEX = {
  spamdResult: /x-spamd-result: .*\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];/i,
  spamScore: /x-spam-score: ([-+]?[0-9]+\.?[0-9]*)/i,
  spamStatus: /x-spam-status: .*(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/i,
  spamReport: /x-spam-report: .*?([-+]?[0-9]+\.?[0-9]*) hits, /i,
  rspamdScore: /x-rspamd-score: .*?([-+]?[0-9]+\.?[0-9]*)/i,
  mailscannerSpamcheck:
    /mailscanner-spamcheck: .*(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),/i,
  vrSpamScore: /x-vr-spamscore: ([0-9]+)/i
}

/** @constant {RegExp} */
export const SPAM_HEADER_REGEX =
  /(X-.*?(?:Spamd-Result|Spam-Report|SpamCheck|Spam-Status|Rspamd-Report):.*(?:\r?\n(?:\t+ *| +).*)*)/g

/** @constant {Object<RegExp>} */
export const SYMBOL_REGEX = {
  prefix: /\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) .*?(?=\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) |$)/gs,
  prefixSingle: /(?:\* +)?(-?[\d.]+)[ \)=]+(?:([A-Z][A-Z0-9_]+)|--) ([\s\S]*?)(?:\[(.*)\])?$/,
  suffix: /([A-Z][A-Z0-9_]+)(?:(?:[ \(=](-?[\d.]+)\)?(?:\[(.*?)\])?)|, *| |\r?\n|$)/g
}
