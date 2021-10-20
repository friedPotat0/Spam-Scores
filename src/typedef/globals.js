// FIREFOX GLOBALS

// https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/basics.html#globals-available-in-the-api-scripts-global

/**
 * Services namespace.
 * Based on Mozilla xpCOM
 * https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/57#changes_for_add-on_and_mozilla_developers
 * @namespace
 * @property {object} xulStore
 * @property {object} obs https://web.archive.org/web/20210603143450/https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIObserverService
 * @property {object} scriptloader
 */
const Services = {}

/**
 * AppConstants
 * @namespace
 * @property {number} MOZ_APP_VERSION Thunderbird Version
 */
const AppConstants = {}

/**
 * WebExtensionPolicy
 * @namespace
 */
const WebExtensionPolicy = {
  /**
   *
   * @param {*} id
   * @returns {extension}
   */
  getByID: id => {}
}
