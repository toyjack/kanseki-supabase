import { describe, expect, test } from "bun:test";
import { decodeLegacyText } from "../src/etl/decode-legacy-text";

describe("decodeLegacyText", () => {
  test("4桁のコードポイントを復号する", () => {
    expect(decodeLegacyText("<si> 672c 9928</si>")).toBe("<si>本館</si>");
  });

  test("先頭が2の5桁コードポイントを復号する", () => {
    expect(decodeLegacyText(" 20000")).toBe("𠀀");
  });

  test("規則に一致しない文字列を変更しない", () => {
    expect(decodeLegacyText("ASCII 123 30000")).toBe("ASCII 123 30000");
  });

  test("大文字の16進数も復号する", () => {
    expect(decodeLegacyText(" 4E00")).toBe("一");
  });
});
