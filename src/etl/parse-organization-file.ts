/** data配下のorganizationファイル（EUC-JP、機関名1行）を機関名へ変換する。 */
export function parseOrganizationFile(bytes: Uint8Array): string {
  return new TextDecoder("euc-jp").decode(bytes).trim();
}
