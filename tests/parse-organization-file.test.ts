import { describe, expect, test } from "bun:test";
import { parseOrganizationFile } from "../src/etl/parse-organization-file";

describe("parseOrganizationFile", () => {
  test("EUC-JPの機関名を復号し前後の空白を除く", () => {
    // "東北大\n" のEUC-JPバイト列（FA001379/organizationの実データより）
    const bytes = new Uint8Array([0xc5, 0xec, 0xcb, 0xcc, 0xc2, 0xe7, 0x0a]);

    expect(parseOrganizationFile(bytes)).toBe("東北大");
  });
});
