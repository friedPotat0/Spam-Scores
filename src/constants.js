/**
 * Constants module
 * @module constants
 * @see module:functions
 */

/**
 * A score lower than this is considered a good email
 * @constant {number}
 */
export const DEFAULT_SCORE_LOWER_BOUNDS = -2.0

/**
 * A score higher than this is considered a bad email
 * @constant {number}
 */
export const DEFAULT_SCORE_UPPER_BOUNDS = 2.0

/**
 * Score families group headers that share a scale. The icon is classified on
 * each family's own scale so raw values from different filters stay comparable.
 * Mode 'threshold' uses lower/upper bounds; 'flag' treats 0 as ham and anything
 * else as spam (e.g. GMX reason codes).
 * @constant
 */
export const SCORE_FAMILIES = {
  spamassassin: { mode: 'threshold', defaultLowerBounds: DEFAULT_SCORE_LOWER_BOUNDS, defaultUpperBounds: DEFAULT_SCORE_UPPER_BOUNDS },
  vade: { mode: 'threshold', defaultLowerBounds: 100, defaultUpperBounds: 300 },
  pmx: { mode: 'threshold', defaultLowerBounds: 20, defaultUpperBounds: 50 },
  gmx: { mode: 'flag' }
}

/**
 * Maps a score header to its family. Headers not listed belong to spamassassin.
 * @constant {Object<string, string>}
 */
export const SCORE_HEADER_FAMILY = {
  'x-vr-spamscore': 'vade',
  'x-pmx-spam': 'pmx',
  'x-gmx-antispam': 'gmx'
}

/**
 * @constant {Object<RegExp>}
 */
export const SCORE_REGEX = {
  'x-spamd-result': /\[([-+]?[0-9]+\.?[0-9]*) \/ [-+]?[0-9]+\.?[0-9]*\];/,
  'x-spam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-rspam-status': /(?:Yes|No)(?:, score=|\/)([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-spam-report': /([-+]?[0-9]+\.?[0-9]*) hits,/,
  'x-ham-report': /([-+]?[0-9]+\.?[0-9]*) hits,/,
  'x-rspamd-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-vr-spamscore': /([0-9]+)/,
  'x-hmailserver-reason-score': /([-+]?[0-9]+\.?[0-9]*)/,
  'x-pmx-spam': /Probability=([0-9]+)%/,
  'x-gmx-antispam': /^([0-9]+)/
}

/**
 * For customised headers
 * @constant {Object<RegExp>}
 */
export const CUSTOM_SCORE_REGEX = {
  'mailscanner-spamcheck':
    /(?:score|punteggio|puntuació|sgor\/score|skore|Wertung|bedømmelse|puntaje|pont|escore|resultat|skore)=([-+]?[0-9]+\.?[0-9]*),/
}

/**
 * Regex for hMailServer reason headers
 * @constant {RegExp}
 */
export const HMAILSERVER_REASON_REGEX = /^x-hmailserver-reason-\d+$/

/**
 * Default order for parsing score headers (first match is used)
 * @constant {String[]}
 */
export const DEFAULT_SCORE_HEADER_ORDER = [
  'x-spamd-result',
  'x-spam-status',
  'x-rspam-status',
  'x-spam-score',
  'x-spam-report',
  'x-ham-report',
  'x-rspamd-score',
  'x-vr-spamscore',
  'x-hmailserver-reason-score',
  'x-pmx-spam',
  'x-gmx-antispam'
]

/**
 * Default order for parsing score details headers (first match is used)
 * @constant {String[]}
 */
export const DEFAULT_SCORE_DETAILS_ORDER = [
  'x-spamd-result',
  'x-spam-result',
  'x-pmx-spam',
  'x-spam-report',
  'x-ham-report',
  'x-spam-status',
  'x-rspamd-report',
  'x-hmailserver-reason-score',
  'x-vr-spamcause'
]

/** @constant {Object<RegExp>} */
export const SYMBOL_REGEX = {
  prefix: /\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) .*?(?=\*? +-?[\d.]+[ \)=]+(?:[A-Z][A-Z0-9_]+|--) |$)/gs,
  prefixSingle: /(?:\* +)?(-?[\d.]+)[ \)=]+(?:([A-Z][A-Z0-9_]+)|--) ([\s\S]*?)(?:\[(.*)\])?$/,
  suffix: /([A-Z][A-Z0-9_]+)(?:(?:[ \(=]+(-?[\d.]+)\)?(?:\[(.*?)\])?)|, *| |\r?\n|$)/g
}
