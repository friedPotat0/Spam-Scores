async function init() {
  initTranslations()
}
init()

function initTranslations() {
  for (const i18nKey of [
    'helloHeadline',
    'helloParagraph1',
    'helloParagraph2',
    'helloParagraph3',
    'helloParagraph4',
    'helloInstruction_1',
    'helloInstruction_2',
    'helloInstruction_3',
    'helloFooterParagraph1',
    'helloFooterParagraph2'
  ]) {
    document
      .querySelectorAll(`*[data-i18n="${i18nKey}"]`)
      .forEach(el => (el.innerHTML = messenger.i18n.getMessage(i18nKey)))
  }
  document.title = messenger.i18n.getMessage('helloPopupTitle')
}
