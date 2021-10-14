// For some reason it works for vscode even if is not imported.

// Big Note: There's no actual documentation it seems that it will be deprecated or whatever...


// Services

/**
 * @typedef {object} DestructuredServices
 * @property {Services} Services
 */

/**
 * Based on Mozilla xpCOM
 * https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/57#changes_for_add-on_and_mozilla_developers
 * Services, so many yet no actual documentation.
 * @typedef {object} Services
 * @property {object} xulStore
 * @property {object} obs https://web.archive.org/web/20210603143450/https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIObserverService
 * @property {object} io
 * @property {object} console
 * @property {object} prefs
 * @property {object} wm
 * @property {object} scriptloader
 */

// Extension Support

/**
 * @typedef {object} DestructuredExtensionSupport
 * @property {ExtensionSupport} ExtensionSupport
 */

/**
 * Extensions, so many yet no actual documentation.
 * @typedef {object} ExtensionSupport
 * @property {object} registerWindowListener
 * @property {object} unregisterWindowListener
 */

/**
 * @typedef {object} DestructuredExtensionParent
 * @property {ExtensionParent} ExtensionParent
 */

/**
 * Extensions, so many yet no actual documentation.
 * @typedef {object} ExtensionParent
 * @property {object} GlobalManager
 */

// /**
//  *
//  * @typedef {object} MailServices
//  */

/**
 * Getting AppConstants
 * @typedef {object} Components
 * @property {Object<string, object>} classes
 */

// App Constants

/**
 * @typedef {object} DestructuredAppConstants
 * @property {AppConstants} AppConstants
 */

/**
 * Getting AppConstants
 * @typedef {object} AppConstants
 * @property {number} MOZ_APP_VERSION Thunderbird Version
 */
