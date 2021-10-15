// For some reason it works for vscode even if is not imported.

// Constants

/**
 * Defined Bounds for different scores
 * @typedef {object} interpolationBounds
 * @property {number} MIN_VALUE
 * @property {number} MAX_VALUE
 * @property {number} LOWER_BOUNDS
 * @property {number} UPPER_BOUNDS
 */

// Program

/**
 * Messenger namespace.
 * In Thunderbird, all WebExtension API can be accessed through the messenger.* namespace,
 * as with Firefox, but also through the messenger.* namespace, which is a better fit for Thunderbird.
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
 * https://webextension-api.thunderbird.net/en/91/#thunderbird-webextension-api-documentation
 * @namespace
 */
const messenger = {
  storage: {
    /**
     * @type {StorageArea}
     */
    local: {},
    /**
     * @type {StorageArea}
     */
    sync: {},
    /**
     * @type {StorageArea}
     */
    managed: {}
  },
  messages: {
    /**
     * Returns a specified message, including all headers and MIME parts.
     *
     * Required permissions [messagesRead]
     * @param {number} messageId
     * @returns {MessagePart}
     */
    getFull: messageId => {}
  },
  /**
   * messagesRead is required to use messageDisplay.
   */
  messageDisplay: {
    /**
     * Fired when a message is displayed, whether in a 3-pane tab, a message tab, or a message window.
     *
     * Required permissions [messagesRead]
     */
    onMessageDisplayed: {
      /**
       * A function that will be called when this event occurs.
       * @param {function(Tab, MessageHeader)} listener
       */
      addListener: listener => {}
    },
    /**
     * Gets the currently displayed message in the specified tab. It returns null if no messages are displayed, or if multiple messages are displayed.
     *
     * Required permissions [messagesRead]
     * @param {number} tabId
     * @returns {Promise<MessageHeader>}
     */
    getDisplayedMessage: tabId => {}
  },
  /**
   * A manifest entry named message_display_action is required to use messageDisplayAction.
   */
  messageDisplayAction: {
    /**
     * Disables the messageDisplayAction for a tab.
     * @param {number} [tabId] The id of the tab for which you want to modify the messageDisplayAction.
     */
    disable: tabId => {},
    /**
     * Enables the messageDisplayAction for a tab. By default, a messageDisplayAction is enabled.
     * @param {number} [tabId] The id of the tab for which you want to modify the messageDisplayAction.
     */
    enable: tabId => {},
    /**
     * Sets the title of the messageDisplayAction. This shows up in the tooltip and the label. Defaults to the add-on name.
     * @param {object} details
     * @param {string|null} details.title The string the messageDisplayAction should display as its label and when moused over.
     */
    setTitle: details => {},
    /**
     * Sets the icon for the messageDisplayAction.
     * The icon can be specified either as the path to an image file or as the pixel data from a canvas element,
     *  or as dictionary of either one of those. Either the path or the imageData property must be specified.
     * @param {object} details
     * @param {ImageDataType | ImageDataDictionary} details.imageData (ImageDataType or ImageDataDictionary) - Either an ImageDataType object defining a single icon used for all sizes or an ImageDataDictionary object defining dedicated icons for different sizes.
     * @param {string | IconPathDictionary} details.path Either a relative image path defining a single icon used for all sizes or an IconPathDictionary object defining dedicated icons for different sizes.
     */
    setIcon: details => {}
  },
  tabs: {
    /**
     * Gets all tabs that have the specified properties, or all tabs if no properties are specified.
     * @param {object} [queryInfo]
     * @param {boolean} [queryInfo.active] Whether the tabs are active in their windows.
     * @param {boolean} [queryInfo.currentWindow] Whether the tabs are in the current window.
     * @param {boolean} [queryInfo.highlighted] Whether the tabs are highlighted. Works as an alias of active.
     * @param {number} [queryInfo.index] The position of the tabs within their windows.
     * @param {boolean} [queryInfo.lastFocusedWindow] Whether the tabs are in the last focused window.
     * @param {boolean} [queryInfo.mailTab] Whether the tab is a Thunderbird 3-pane tab.
     * @param {TabStatus} [queryInfo.status] Whether the tabs have completed loading.
     * @param {string} [queryInfo.title] Match page titles against a pattern.
     * @param {string} [queryInfo.type] – [Added in TB 91] Match tabs against the given Tab.type (see Tab). Ignored if queryInfo.mailTab is specified.
     * @param {string|string[]} [queryInfo.url] Match tabs against one or more URL Patterns. Note that fragment identifiers are not matched.
     * @param {number} [queryInfo.windowId] The ID of the parent window, or WINDOW_ID_CURRENT for the current window.
     * @param {WindowType} [queryInfo.windowType] The type of window the tabs are in.
     * @return {Promise<Tab[]>} tabs
     */
    query: queryInfo => {}
  },
  i18n: {
    /**
     * Gets the localized string for the specified message.
     * @param {string} messageName
     * @param {string|string[]} [substitutions]
     * @returns {string} Message localized for current locale.
     */
    getMessage: (messageName, substitutions) => ''
  },
  /**
   * This module provides information about your extension and the environment it's running in.
   */
  runtime: {
    /**
     * Retrieves the Window object for the background page running inside the current extension.
     * @returns {Promise<Window>} A Promise that will be fulfilled with the Window object for the background page, if there is one.
     * If the extension does not include a background page, the promise is rejected with an error message.
     */
    getBackgroundPage: () => {}
  },
  /**
   * @type {SpamScores}
   */
  SpamScores: {}
}

/**
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local
 * dlh2: Is not complete
 * @typedef {object} StorageArea
 * @property {function(string[]=):Promise<(Object<string, object>)>} get
 * @property {function(Object<string, any>):Promise<void>} set
 */

/**
 * https://webextension-api.thunderbird.net/en/91/messages.html#messages-messagepart
 * @typedef {object} MessagePart
 * @property {string} body The content of the part
 * @property {string} contentType
 * @property {Object<string, string[]} headers An object of part headers, with the header name as key, and an array of header values as value
 * @property {string} name Name of the part, if it is a file
 * @property {string} partName
 * @property {string} parts (array of MessagePart)  Any sub-parts of this part
 * @property {number} size
 */

/**
 * A {size: path} dictionary representing the icon to be set.
 * The actual image to be used is chosen depending on the screen’s pixel density.
 * See the MDN documentation about choosing icon sizes for more information on this.
 * At least one icon must be specified.
 * https://webextension-api.thunderbird.net/en/91/messageDisplayAction.html#iconpathdictionary
 * @typedef {Object.<string, string>} IconPathDictionary
 */

/**
 * Pixel data for an image. Must be an ImageData object (for example, from a canvas element).
 * @typedef {ImageData} ImageDataType
 */

/**
 * A {size: ImageDataType} dictionary representing the icon to be set.
 * The actual ImageDataType to be used is chosen depending on the screen’s pixel density.
 * See the MDN documentation on browser styles for more information on this.
 * At least one ImageDataType must be specified.
 * https://webextension-api.thunderbird.net/en/91/messageDisplayAction.html#messagedisplayaction-imagedatadictionary
 * @typedef {Object.<string, ImageDataType>} ImageDataDictionary
 */

/**
 * The type of a window. Under some circumstances a Window may not be assigned a type property.
 * @typedef {('normal'|'popup'|'panel'|'app'|'devtools'|'addressBook'|'messageCompose'|'messageDisplay')} WindowType
 */

/**
 * Whether the tabs have completed loading.
 * @typedef {('loading'|'complete')} TabStatus
 */

/**
 * https://webextension-api.thunderbird.net/en/91/tabs.html#tabs-tab
 * dlh2: Is not complete
 * @typedef {object} Tab
 * @property {number} id The ID of the tab. Tab IDs are unique within a browser session.
 * Under some circumstances a Tab may not be assigned an ID.
 * Tab ID can also be set to TAB_ID_NONE for apps and devtools windows.
 */

/**
 * https://webextension-api.thunderbird.net/en/91/messages.html#messages-messageheader
 * dlh2: Is not complete
 * @typedef {object} MessageHeader
 * @property {number} id
 */

/**
 * Custom
 * @typedef {object} parsedDetailScores
 * @property {string} name
 * @property {number} score
 * @property {string} info
 * @property {string} [description]
 */
