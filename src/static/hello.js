async function init() {
  initTranslations()
}
init()

function initTranslations() {
  for (let i18nKey of [
    'helloHeadline',
    'helloParagraph1',
    'helloParagraph2',
    'helloParagraph3',
    'helloFooterParagraph1',
    'helloFooterParagraph2'
  ]) {
    document
      .querySelectorAll(`*[data-i18n="${i18nKey}"]`)
      .forEach(el => (el.innerHTML = browser.i18n.getMessage(i18nKey)))
  }
  document.title = browser.i18n.getMessage('helloPopupTitle')
}
