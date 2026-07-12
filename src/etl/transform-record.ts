import { normalizePinyin, normalizeTitleKey } from "./normalize";
import type { TaggedDat } from "./parse-tagged-dat";

export interface ImportedAuthor {
  dynastyText: string | null;
  nameText: string;
  namePinyin: string | null;
  roleText: string | null;
  displayOrder: number;
}

export interface ImportedRecord {
  faCode: string;
  collectionName: string | null;
  nu: string;
  oyNu: string | null;
  ti: string;
  tiKey: string;
  tiPinyin: string | null;
  st: string | null;
  stPinyin: string | null;
  pt: string | null;
  ptPinyin: string | null;
  fi: string | null;
  sf: string | null;
  tg: string | null;
  ki: string | null;
  tp: string | null;
  yr: string | null;
  pb: string | null;
  ed: string | null;
  sd: string | null;
  vi: string | null;
  si: string | null;
  rn: string | null;
  co: string | null;
  no: string | null;
  sourceMtime: Date;
  authors: readonly ImportedAuthor[];
}

export interface RecordContext {
  faCode: string;
  sourceMtime: Date;
}

export class InvalidTaggedRecordError extends Error {
  constructor(field: string) {
    super(`必須タグ<${field}>がありません`);
    this.name = "InvalidTaggedRecordError";
  }
}

function first(fields: TaggedDat, tag: string): string | null {
  const value = fields.get(tag)?.[0]?.trim();
  return value ? value : null;
}

/** auの「時代,人名,役割」という位置的構造を分解する。 */
export function parseAuthor(
  value: string,
  pinyin: string | undefined,
  displayOrder: number,
): ImportedAuthor {
  const parts = value.split(/[,，]/u).map((part) => part.trim());

  if (parts.length === 1 && parts[0]) {
    return {
      dynastyText: null,
      nameText: parts[0],
      namePinyin: pinyin ? normalizePinyin(pinyin) : null,
      roleText: null,
      displayOrder,
    };
  }

  const dynastyText = parts.shift() || null;
  const nameText = parts.shift();
  const roleText = parts.join(",").trim() || null;

  if (!nameText) {
    throw new InvalidTaggedRecordError("au");
  }

  return {
    dynastyText,
    nameText,
    namePinyin: pinyin ? normalizePinyin(pinyin) : null,
    roleText,
    displayOrder,
  };
}

/** 解析済みタグをDB投入前の書誌レコードへ変換する。 */
export function transformTaggedRecord(
  fields: TaggedDat,
  context: RecordContext,
): ImportedRecord {
  const nu = first(fields, "nu");
  const ti = first(fields, "ti");
  if (!nu) throw new InvalidTaggedRecordError("nu");
  if (!ti) throw new InvalidTaggedRecordError("ti");

  const pinyinAuthors = fields.get("AU") ?? [];
  const authors = (fields.get("au") ?? []).map((author, index) =>
    parseAuthor(author, pinyinAuthors[index], index),
  );

  const tiPinyin = first(fields, "TI");
  const stPinyin = first(fields, "ST");
  const ptPinyin = first(fields, "PT");

  return {
    faCode: context.faCode,
    collectionName: first(fields, "se"),
    nu,
    oyNu: first(fields, "oy"),
    ti,
    tiKey: normalizeTitleKey(ti),
    tiPinyin: tiPinyin ? normalizePinyin(tiPinyin) : null,
    st: first(fields, "st"),
    stPinyin: stPinyin ? normalizePinyin(stPinyin) : null,
    pt: first(fields, "pt"),
    ptPinyin: ptPinyin ? normalizePinyin(ptPinyin) : null,
    fi: first(fields, "fi"),
    sf: first(fields, "sf"),
    tg: first(fields, "tg"),
    ki: first(fields, "ki"),
    tp: first(fields, "tp"),
    yr: first(fields, "yr"),
    pb: first(fields, "pb"),
    ed: first(fields, "ed"),
    sd: first(fields, "sd"),
    vi: first(fields, "vi"),
    si: first(fields, "si"),
    rn: first(fields, "rn"),
    co: first(fields, "co"),
    no: first(fields, "no"),
    sourceMtime: context.sourceMtime,
    authors,
  };
}
