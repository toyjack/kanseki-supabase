import { expect, test } from "bun:test";
import {
  createDatabaseClient,
  importInstitutionInTransaction,
} from "../src/db/import-institution";
import { parseTaggedDat } from "../src/etl/parse-tagged-dat";
import { transformTaggedRecord } from "../src/etl/transform-record";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? test : test.skip;

databaseTest(
  "実DBへの2パス投入と論理削除をロールバック内で検証する",
  async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URLが設定されていません");

    const sql = createDatabaseClient(databaseUrl);
    const faCode = `TEST${crypto.randomUUID().slice(0, 8)}`;
    const sourceMtime = new Date("2026-07-12T00:00:00Z");
    const child = transformTaggedRecord(
      parseTaggedDat(
        "<nu>2</nu><oy>1</oy><ti>尚書,二十卷</ti><au>漢,孔安國,傳</au>",
      ),
      { faCode, sourceMtime },
    );
    const parent = transformTaggedRecord(
      parseTaggedDat("<nu>1</nu><ti>尚書,十卷</ti>"),
      { faCode, sourceMtime },
    );

    try {
      await expect(
        sql.begin(async (transaction) => {
          const imported = await importInstitutionInTransaction(transaction, {
            faCode,
            organizationName: "結合テスト機関",
            records: [child, parent],
            deletedRecords: [],
          });
          expect(imported.importedCount).toBe(2);
          expect(imported.warnings).toEqual([]);

          const [state] = await transaction<
            {
              records: number;
              authors: number;
              works: number;
              parent_links: number;
            }[]
          >`
          SELECT
            count(DISTINCT r.id)::int AS records,
            count(DISTINCT a.id)::int AS authors,
            count(DISTINCT w.id)::int AS works,
            count(DISTINCT r.id) FILTER (WHERE r.oy_record_id IS NOT NULL)::int AS parent_links
          FROM records r
          LEFT JOIN authors a ON a.record_id = r.id
          LEFT JOIN works w ON w.id = r.work_id
          WHERE r.fa_code = ${faCode}
        `;
          expect(state).toEqual({
            records: 2,
            authors: 1,
            works: 1,
            parent_links: 1,
          });

          const deleted = await importInstitutionInTransaction(transaction, {
            faCode,
            organizationName: "結合テスト機関",
            records: [],
            deletedRecords: [{ collectionId: null, nu: "2" }],
          });
          expect(deleted.deletedCount).toBe(1);

          const [tombstone] = await transaction<{ deleted: boolean }[]>`
          SELECT deleted_at IS NOT NULL AS deleted
          FROM records
          WHERE fa_code = ${faCode} AND nu = '2'
        `;
          expect(tombstone?.deleted).toBe(true);

          throw new Error("ROLLBACK_DATABASE_TEST");
        }),
      ).rejects.toThrow("ROLLBACK_DATABASE_TEST");
    } finally {
      await sql.end();
    }
  },
);

databaseTest(
  "明示的なseタグを持つレコードのみコレクションを共有させる",
  async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URLが設定されていません");

    const sql = createDatabaseClient(databaseUrl);
    const faCode = `TEST${crypto.randomUUID().slice(0, 8)}`;
    const sourceMtime = new Date("2026-07-12T00:00:00Z");
    const withCollection = transformTaggedRecord(
      parseTaggedDat("<nu>1</nu><ti>尚書,十卷</ti><se>金谷文庫</se>"),
      { faCode, sourceMtime },
    );
    const otherWithCollection = transformTaggedRecord(
      parseTaggedDat("<nu>2</nu><ti>周易,十卷</ti><se>金谷文庫</se>"),
      { faCode, sourceMtime },
    );
    const withoutCollection = transformTaggedRecord(
      parseTaggedDat("<nu>3</nu><ti>詩經,十卷</ti>"),
      { faCode, sourceMtime },
    );

    try {
      await expect(
        sql.begin(async (transaction) => {
          await importInstitutionInTransaction(transaction, {
            faCode,
            organizationName: "結合テスト機関",
            records: [withCollection, otherWithCollection, withoutCollection],
            deletedRecords: [],
          });

          const collections = await transaction<
            { name: string; count: number }[]
          >`
            SELECT c.name, count(r.id)::int AS count
            FROM collections c
            JOIN records r ON r.collection_id = c.id
            WHERE c.fa_code = ${faCode}
            GROUP BY c.name
          `;
          expect([...collections]).toEqual([{ name: "金谷文庫", count: 2 }]);

          const [withoutCollectionRow] = await transaction<
            { collection_id: string | null }[]
          >`
            SELECT collection_id FROM records
            WHERE fa_code = ${faCode} AND nu = '3'
          `;
          expect(withoutCollectionRow?.collection_id).toBeNull();

          throw new Error("ROLLBACK_DATABASE_TEST");
        }),
      ).rejects.toThrow("ROLLBACK_DATABASE_TEST");
    } finally {
      await sql.end();
    }
  },
);
