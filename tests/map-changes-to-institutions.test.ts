import { describe, expect, test } from "bun:test";
import { mapChangesToInstitutions } from "../src/sync/map-changes-to-institutions";

describe("mapChangesToInstitutions", () => {
  test("機関コードごとに変更・削除対象をまとめる", () => {
    const result = mapChangesToInstitutions({
      transferredFiles: [
        "FA001379/tagged/0039010.dat",
        "FA001379/taggedKanaya/0039011.dat",
        "FA002655/tagged/0000001.dat",
      ],
      deletedFiles: ["FA001379/tagged/0039012.dat"],
      warnings: [],
    });

    expect(result.institutions).toEqual([
      {
        faCode: "FA001379",
        changedRecordPaths: [
          "FA001379/tagged/0039010.dat",
          "FA001379/taggedKanaya/0039011.dat",
        ],
        deletedRecordNus: ["0039012"],
      },
      {
        faCode: "FA002655",
        changedRecordPaths: ["FA002655/tagged/0000001.dat"],
        deletedRecordNus: [],
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  test("tagged*/以外のパスを警告して無視する", () => {
    const result = mapChangesToInstitutions({
      transferredFiles: ["FA001379/organization"],
      deletedFiles: [],
      warnings: [],
    });

    expect(result.institutions).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
