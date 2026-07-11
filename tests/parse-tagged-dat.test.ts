import { describe, expect, test } from "bun:test";
import {
  parseTaggedDat,
  UnsupportedTaggedDatFormatError,
} from "../src/etl/parse-tagged-dat";

describe("parseTaggedDat", () => {
  test("標準タグと16進コードポイントを解析する", () => {
    const fields = parseTaggedDat(
      "<nu>0039010</nu>\n<ti><key> 5c1a 66f8</key>,二十卷</ti>",
    );

    expect(fields.get("nu")).toEqual(["0039010"]);
    expect(fields.get("ti")).toEqual(["尚書,二十卷"]);
  });

  test("大文字と小文字のタグを区別する", () => {
    const fields = parseTaggedDat("<ti>尚書</ti><TI>SHANG4 SHU1</TI>");

    expect(fields.get("ti")).toEqual(["尚書"]);
    expect(fields.get("TI")).toEqual(["SHANG4 SHU1"]);
  });

  test("複数の著者を順序どおり保持する", () => {
    const fields = parseTaggedDat("<au>漢,孔安國,傳</au><au>唐,孔穎達,疏</au>");

    expect(fields.get("au")).toEqual(["漢,孔安國,傳", "唐,孔穎達,疏"]);
  });

  test("FA011962型の行形式を拒否する", () => {
    expect(() => parseTaggedDat("nu:-1\nti:song4 yuan2")).toThrow(
      UnsupportedTaggedDatFormatError,
    );
  });
});
