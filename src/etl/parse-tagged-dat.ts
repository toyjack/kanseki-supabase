import { decodeLegacyText } from "./decode-legacy-text";

export type TaggedDat = ReadonlyMap<string, readonly string[]>;

const tagPattern = /<([A-Za-z][A-Za-z0-9]*)>([\s\S]*?)<\/\1>/g;
const nestedTagPattern = /<\/?[A-Za-z][A-Za-z0-9]*>/g;

/** 標準のXML類似形式でない入力を示す。 */
export class UnsupportedTaggedDatFormatError extends Error {
  constructor() {
    super("標準のXML類似タグ形式ではありません");
    this.name = "UnsupportedTaggedDatFormatError";
  }
}

/** 標準形式のtagged/*.datを、タグごとの値へ変換する。 */
export function parseTaggedDat(source: string): TaggedDat {
  const decoded = decodeLegacyText(source);
  const fields = new Map<string, string[]>();

  for (const match of decoded.matchAll(tagPattern)) {
    const [, tag, rawValue] = match;
    if (tag === undefined || rawValue === undefined) {
      continue;
    }

    const value = rawValue.replace(nestedTagPattern, "").trim();
    const values = fields.get(tag) ?? [];
    values.push(value);
    fields.set(tag, values);
  }

  if (fields.size === 0) {
    throw new UnsupportedTaggedDatFormatError();
  }

  return fields;
}
