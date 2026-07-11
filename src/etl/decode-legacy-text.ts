const encodedCodePointPattern = / 2?[0-9a-f]{4}(?![0-9a-f])/gi;

/** レガシー形式の「半角スペース＋16進コードポイント」をUnicodeへ変換する。 */
export function decodeLegacyText(value: string): string {
  return value.replace(encodedCodePointPattern, (encoded) => {
    const codePoint = Number.parseInt(encoded.slice(1), 16);
    return String.fromCodePoint(codePoint);
  });
}
