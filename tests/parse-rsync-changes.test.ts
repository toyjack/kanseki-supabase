import { describe, expect, test } from "bun:test";
import { parseRsyncChanges } from "../src/sync/parse-rsync-changes";

describe("parseRsyncChanges", () => {
  test("転送された.datだけを変更対象にする", () => {
    const result = parseRsyncChanges(`
>f+++++++++ data/FA001379/tagged/0039010.dat
>f.st...... data/FA001379/tagged/0039011.dat
cd+++++++++ data/FA001379/tagged/
>f+++++++++ data/FA001379/organization
    `);

    expect(result.transferredFiles).toEqual([
      "data/FA001379/tagged/0039010.dat",
      "data/FA001379/tagged/0039011.dat",
    ]);
    expect(result.deletedFiles).toEqual([]);
  });

  test("削除された.datを論理削除対象にする", () => {
    const result = parseRsyncChanges(`
*deleting   data/FA001379/tagged/0039012.dat
*deleting   data/FA001379/tagged/
    `);

    expect(result.deletedFiles).toEqual(["data/FA001379/tagged/0039012.dat"]);
  });

  test("空白を含む相対パスを保持する", () => {
    const result = parseRsyncChanges(
      ">f+++++++++ data/FA001379/tagged special/0039010.dat",
    );

    expect(result.transferredFiles).toEqual([
      "data/FA001379/tagged special/0039010.dat",
    ]);
  });

  test("絶対パスとパストラバーサルを警告して無視する", () => {
    const result = parseRsyncChanges(`
>f+++++++++ /tmp/record.dat
>f+++++++++ data/../secret.dat
    `);

    expect(result.transferredFiles).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  test("同じパスを重複して返さない", () => {
    const result = parseRsyncChanges(`
>f+++++++++ data/FA001379/tagged/0039010.dat
>f+++++++++ data/FA001379/tagged/0039010.dat
    `);

    expect(result.transferredFiles).toEqual([
      "data/FA001379/tagged/0039010.dat",
    ]);
  });
});
