const volumeSeparatorPattern = /[,，].*$/u;
const whitespacePattern = /[\s\u3000]+/gu;
const toneNumberPattern = /[1-5]/g;

/** 書名から巻数部分を除き、全角・半角空白を統一する。 */
export function normalizeTitleKey(title: string): string {
  return title
    .replace(volumeSeparatorPattern, "")
    .replace(whitespacePattern, " ")
    .trim();
}

/** ピンインの声調番号を除去し、検索用の空白を統一する。 */
export function normalizePinyin(pinyin: string): string {
  return pinyin
    .replace(toneNumberPattern, "")
    .replace(whitespacePattern, " ")
    .trim();
}
