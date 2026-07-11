import { describe, expect, test } from "bun:test";

const schemaPath = new URL(
  "../supabase/migrations/202607110001_initial_schema.sql",
  import.meta.url,
);
const searchPath = new URL(
  "../supabase/migrations/202607110002_search_indexes.sql",
  import.meta.url,
);

const schema = await Bun.file(schemaPath).text();
const searchIndexes = await Bun.file(searchPath).text();

describe("初期スキーママイグレーション", () => {
  test("PGroongaと仕様上の全テーブルを定義する", () => {
    expect(schema).toContain("CREATE EXTENSION IF NOT EXISTS pgroonga");

    for (const table of [
      "organizations",
      "collections",
      "records",
      "authors",
      "persons",
      "works",
      "variant_characters",
    ]) {
      expect(schema).toContain(`CREATE TABLE ${table}`);
    }
  });

  test("NULLのcollection_idを含む複合自然キーを定義する", () => {
    expect(schema).toContain(
      "UNIQUE NULLS NOT DISTINCT (fa_code, collection_id, nu)",
    );
  });

  test("oyの自己参照を禁止する", () => {
    expect(schema).toContain(
      "CHECK (oy_record_id IS NULL OR oy_record_id <> id)",
    );
  });

  test("分類カラムをtextとして定義する", () => {
    for (const column of ["fi", "sf", "tg", "ki"]) {
      expect(schema).toMatch(new RegExp(`\\b${column} text`));
    }
  });
});

describe("検索インデックスマイグレーション", () => {
  test("異体字テーブルを使用するNormalizerTableを定義する", () => {
    expect(searchIndexes).toContain("NormalizerTable(");
    expect(searchIndexes).toContain(
      "$" + "{table:public.pgrn_variant_characters_index}.normalized",
    );
  });

  test("書名、付録書名、別名、著者名を索引化する", () => {
    for (const column of ["ti", "st", "pt", "name_text"]) {
      expect(searchIndexes).toMatch(
        new RegExp(`USING pgroonga \\(${column}\\)`),
      );
    }
  });

  test("ピンイン列を索引化する", () => {
    for (const column of [
      "ti_pinyin",
      "st_pinyin",
      "pt_pinyin",
      "name_pinyin",
    ]) {
      expect(searchIndexes).toContain(column);
    }
  });
});
