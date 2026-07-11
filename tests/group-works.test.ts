import { describe, expect, test } from "bun:test";
import { groupWorks } from "../src/etl/group-works";

describe("groupWorks", () => {
  test("同一ti_keyだけを仮グループ化する", () => {
    expect(
      groupWorks([
        { recordId: "a", tiKey: "尚書" },
        { recordId: "b", tiKey: "尚書" },
        { recordId: "c", tiKey: "尙書" },
      ]),
    ).toEqual([
      { preferredTitle: "尚書", recordIds: ["a", "b"] },
      { preferredTitle: "尙書", recordIds: ["c"] },
    ]);
  });
});
