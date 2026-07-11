import { describe, expect, test } from "bun:test";
import { normalizePinyin, normalizeTitleKey } from "../src/etl/normalize";

describe("normalizeTitleKey", () => {
  test("巻数と余分な空白を除去する", () => {
    expect(normalizeTitleKey(" 尚書　註疏,二十卷 ")).toBe("尚書 註疏");
  });

  test("異体字は変換しない", () => {
    expect(normalizeTitleKey("國語")).toBe("國語");
  });
});

describe("normalizePinyin", () => {
  test("声調番号と余分な空白を除去する", () => {
    expect(normalizePinyin("WU3  JING1　ZHENG4 WEN2")).toBe(
      "WU JING ZHENG WEN",
    );
  });
});
