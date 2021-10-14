/**
 * Constants module.
 * @module constants
 * @see module:functions
 */

/**
 * Less than this score is a good email
 * @constant {number}
 */
export const DEFAULT_SCORE_LOWER_BOUNDS = -2.0

/**
 * Greater than this score is a bad email
 * @constant {number}
 */
export const DEFAULT_SCORE_UPPER_BOUNDS = 2.0

/**
 * Minimum score for SCORE_INTERPOLATION
 * @constant {number} Minimum score seen from the first Score Domain that was made for (Rspamd score)
 * @see module:functions.scoreInterpolation
 */
export const MIN_SCORE_SEEN = -40

/**
 * Maximum score for SCORE_INTERPOLATION
 * @constant {number} Maximum score seen from the first Score Domain that was made for (Rspamd score)
 * @see module:functions.scoreInterpolation
 */
export const MAX_SCORE_SEEN = 40

/**
 * @constant {Object<string, interpolationBounds>}
 * @type {Object<string, interpolationBounds>}
 */
export const SCORE_INTERPOLATION = {
  'x-vr-spamscore': { MIN_VALUE: 0, MAX_VALUE: 900, LOWER_BOUNDS: 100, UPPER_BOUNDS: 300 }
}

/**
 * @constant {Object<RegExp>}
 */
export const SCORE_REGEX = {
  'x-spam-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-rspamd-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-vr-spamscore': /([0-9]+)/,
  'x-spamd-result': /\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];/,
  'x-spam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-report': /([-+]?[0-9]+\.?[0-9]*) hits,/
}

/**
 * @constant {String[]}
 */
export const SCORE_ARRAY = [
  'x-spam-score',
  'x-rspamd-score',
  'x-vr-spamscore',
  'x-spamd-result',
  'x-spam-status',
  'x-spam-report'
]

/**
 * For customized headers
 * @constant {Object<RegExp>}
 */
export const CUSTOM_SCORE_REGEX = {
  'mailscanner-spamcheck':
    /(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),/
}

/** @constant {RegExp} */
export const SPAM_HEADER_REGEX =
  /(X-.*?(?:Spamd-Result|Spam-Report|SpamCheck|Spam-Status|Rspamd-Report):.*(?:\r?\n(?:\t+ *| +).*)*)/g

/**
 * Headers that contains the details of the scores
 * @constant {String[]}
 */
export const SCORE_DETAILS_ARRAY = [
  'x-spamd-result',
  'x-spam-report',
  'x-spamcheck',
  'x-spam-status',
  'x-rspamd-report'
]

/** @constant {Object<RegExp>} */
export const SYMBOL_REGEX = {
  prefix: /\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) .*?(?=\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) |$)/gs,
  prefixSingle: /(?:\* +)?(-?[\d.]+)[ \)=]+(?:([A-Z][A-Z0-9_]+)|--) ([\s\S]*?)(?:\[(.*)\])?$/,
  suffix: /([A-Z][A-Z0-9_]+)(?:(?:[ \(=](-?[\d.]+)\)?(?:\[(.*?)\])?)|, *| |\r?\n|$)/g
}
