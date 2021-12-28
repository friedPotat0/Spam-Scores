const i18n = messenger.i18n
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
  document.querySelector('*[data-i18n="' + i18nKey + '"]').innerHTML = i18n.getMessage(i18nKey)
}
document.title = i18n.getMessage('helloPopupTitle')
