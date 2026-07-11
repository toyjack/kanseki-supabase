import { describe, expect, test } from "bun:test";
import { mergeVariantCharacters } from "../src/etl/merge-variant-characters";

describe("mergeVariantCharacters", () => {
  test("同一targetではUniVariantsを優先する", () => {
    expect(
      mergeVariantCharacters(
        [{ target: "峯", normalized: "峰" }],
        [
          { target: "峯", normalized: "峯" },
          { target: "书", normalized: "書" },
        ],
      ),
    ).toEqual([
      { target: "峯", normalized: "峰", source: "univariants" },
      { target: "书", normalized: "書", source: "opencc" },
    ]);
  });

  test("逆方向の恒等マッピングを追加しない", () => {
    const result = mergeVariantCharacters(
      [{ target: "峯", normalized: "峰" }],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result.some(({ target }) => target === "峰")).toBe(false);
  });
});
