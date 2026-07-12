import { describe, expect, test } from "bun:test";
import { buildRsyncArguments } from "../src/sync/run-rsync";

describe("buildRsyncArguments", () => {
  test("差分一覧と削除検出に必要な固定引数を生成する", () => {
    expect(
      buildRsyncArguments({
        source: "legacy:/srv/kanseki/data",
        destination: "/srv/kanseki/mirror",
      }),
    ).toEqual([
      "--archive",
      "--delete",
      "--itemize-changes",
      "--out-format=%i %n%L",
      "--prune-empty-dirs",
      "--include=FA*/",
      "--include=FA*/organization",
      "--include=FA*/tagged*/",
      "--include=FA*/tagged*/*.dat",
      "--exclude=*",
      "legacy:/srv/kanseki/data/",
      "/srv/kanseki/mirror/",
    ]);
  });

  test("空の設定を拒否する", () => {
    expect(() =>
      buildRsyncArguments({ source: "", destination: "/tmp/mirror" }),
    ).toThrow("RSYNC_SOURCE");
    expect(() =>
      buildRsyncArguments({ source: "legacy:/data", destination: "" }),
    ).toThrow("RSYNC_DESTINATION");
  });
});
