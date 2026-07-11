import { describe, expect, test } from "bun:test";
import { parseTaggedDat } from "../src/etl/parse-tagged-dat";
import {
  InvalidTaggedRecordError,
  parseAuthor,
  transformTaggedRecord,
} from "../src/etl/transform-record";

describe("parseAuthor", () => {
  test("時代、人名、役割とピンインを分解する", () => {
    expect(parseAuthor("漢,孔安國,傳", "KONG3 AN1 GUO2", 0)).toEqual({
      dynastyText: "漢",
      nameText: "孔安國",
      namePinyin: "KONG AN GUO",
      roleText: "傳",
      displayOrder: 0,
    });
  });

  test("人名だけの著者を受け入れる", () => {
    expect(parseAuthor("孔子", undefined, 1)).toEqual({
      dynastyText: null,
      nameText: "孔子",
      namePinyin: null,
      roleText: null,
      displayOrder: 1,
    });
  });
});

describe("transformTaggedRecord", () => {
  test("タグをレコードと著者へ変換する", () => {
    const fields = parseTaggedDat(`
      <nu>0039010</nu><oy>0039000</oy>
      <ti>尚書　註疏,二十卷</ti><TI>SHANG4 SHU1</TI>
      <au>漢,孔安國,傳</au><AU>KONG3 AN1 GUO2</AU>
      <fi>經部</fi><sf>書類</sf>
    `);
    const sourceMtime = new Date("2026-07-11T00:00:00Z");
    const record = transformTaggedRecord(fields, {
      faCode: "FA001379",
      collectionId: null,
      sourceMtime,
    });

    expect(record.nu).toBe("0039010");
    expect(record.oyNu).toBe("0039000");
    expect(record.tiKey).toBe("尚書 註疏");
    expect(record.tiPinyin).toBe("SHANG SHU");
    expect(record.fi).toBe("經部");
    expect(record.authors[0]?.nameText).toBe("孔安國");
    expect(record.sourceMtime).toBe(sourceMtime);
  });

  test("必須タグがないレコードを拒否する", () => {
    const fields = parseTaggedDat("<nu>0039010</nu>");
    expect(() =>
      transformTaggedRecord(fields, {
        faCode: "FA001379",
        collectionId: null,
        sourceMtime: new Date(),
      }),
    ).toThrow(InvalidTaggedRecordError);
  });
});
