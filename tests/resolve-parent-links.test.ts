import { describe, expect, test } from "bun:test";
import { resolveParentLinks } from "../src/etl/resolve-parent-links";

const base = { faCode: "FA001379", collectionId: null };

describe("resolveParentLinks", () => {
  test("ファイル順序に依存せず親を解決する", () => {
    const result = resolveParentLinks([
      { ...base, id: "child", nu: "2", oyNu: "1" },
      { ...base, id: "parent", nu: "1", oyNu: null },
    ]);

    expect(result.links).toEqual([{ recordId: "child", oyRecordId: "parent" }]);
    expect(result.warnings).toEqual([]);
  });

  test("コレクションをまたいで親を解決しない", () => {
    const result = resolveParentLinks([
      { ...base, id: "child", nu: "2", oyNu: "1" },
      { ...base, collectionId: "other", id: "parent", nu: "1", oyNu: null },
    ]);

    expect(result.links).toEqual([]);
    expect(result.warnings[0]?.message).toContain("見つかりません");
  });

  test("自己参照をスキップする", () => {
    const result = resolveParentLinks([
      { ...base, id: "self", nu: "1", oyNu: "1" },
    ]);

    expect(result.links).toEqual([]);
    expect(result.warnings[0]?.message).toContain("自分自身");
  });

  test("循環するすべての関係をスキップする", () => {
    const result = resolveParentLinks([
      { ...base, id: "a", nu: "1", oyNu: "2" },
      { ...base, id: "b", nu: "2", oyNu: "1" },
    ]);

    expect(result.links).toEqual([]);
    expect(result.warnings).toHaveLength(2);
    expect(
      result.warnings.every(({ message }) => message.includes("循環")),
    ).toBe(true);
  });

  test("階層数に上限を設けない", () => {
    const records = Array.from({ length: 10 }, (_, index) => ({
      ...base,
      id: String(index),
      nu: String(index),
      oyNu: index === 0 ? null : String(index - 1),
    })).reverse();

    expect(resolveParentLinks(records).links).toHaveLength(9);
  });
});
