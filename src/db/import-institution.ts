import postgres from "postgres";
import { resolveParentLinks } from "../etl/resolve-parent-links";
import type { ImportedRecord } from "../etl/transform-record";

export interface DeletedRecord {
  nu: string;
}

export interface InstitutionImport {
  faCode: string;
  organizationName: string;
  records: readonly ImportedRecord[];
  deletedRecords: readonly DeletedRecord[];
}

export interface InstitutionImportResult {
  faCode: string;
  importedCount: number;
  deletedCount: number;
  warnings: readonly string[];
}

export interface BatchImportResult {
  succeeded: readonly InstitutionImportResult[];
  failed: readonly { faCode: string; error: string }[];
}

interface StoredRecord {
  id: string;
  faCode: string;
  collectionId: string | null;
  nu: string;
  oyNu: string | null;
}

/** DATABASE_URLからPostgreSQLクライアントを作成する。 */
export function createDatabaseClient(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl, { max: 5, prepare: true });
}

/** 1機関分を単一トランザクションで取り込む。 */
export async function importInstitution(
  sql: postgres.Sql,
  input: InstitutionImport,
): Promise<InstitutionImportResult> {
  return sql.begin((transaction) =>
    importInstitutionInTransaction(transaction, input),
  );
}

/** 複数機関を順番に処理し、失敗を当該機関だけに隔離する。 */
export async function importInstitutions(
  sql: postgres.Sql,
  inputs: readonly InstitutionImport[],
): Promise<BatchImportResult> {
  const succeeded: InstitutionImportResult[] = [];
  const failed: { faCode: string; error: string }[] = [];

  for (const input of inputs) {
    try {
      succeeded.push(await importInstitution(sql, input));
    } catch (error) {
      failed.push({
        faCode: input.faCode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { succeeded, failed };
}

/** 結合テストからも利用できる、トランザクション内部の取込み本体。 */
export async function importInstitutionInTransaction(
  sql: postgres.TransactionSql,
  input: InstitutionImport,
): Promise<InstitutionImportResult> {
  await sql`
    INSERT INTO organizations (fa_code, name)
    VALUES (${input.faCode}, ${input.organizationName})
    ON CONFLICT (fa_code) DO UPDATE SET name = EXCLUDED.name
  `;

  const storedRecords: StoredRecord[] = [];
  for (const record of input.records) {
    if (record.faCode !== input.faCode) {
      throw new Error(`機関コードが一致しません: ${record.faCode}`);
    }

    const workId = await getOrCreateWork(sql, record.tiKey);
    const collectionId = await getOrCreateCollection(
      sql,
      record.faCode,
      record.collectionName,
    );
    const [stored] = await sql<{ id: string }[]>`
      INSERT INTO records (
        fa_code, collection_id, oy_record_id, work_id, nu,
        ti, ti_key, ti_pinyin, st, st_pinyin, pt, pt_pinyin,
        fi, sf, tg, ki, tp, yr, pb, ed, sd, vi, si, rn, co, no,
        source_mtime, imported_at, deleted_at
      ) VALUES (
        ${record.faCode}, ${collectionId}, NULL, ${workId}, ${record.nu},
        ${record.ti}, ${record.tiKey}, ${record.tiPinyin}, ${record.st},
        ${record.stPinyin}, ${record.pt}, ${record.ptPinyin}, ${record.fi},
        ${record.sf}, ${record.tg}, ${record.ki}, ${record.tp}, ${record.yr},
        ${record.pb}, ${record.ed}, ${record.sd}, ${record.vi}, ${record.si},
        ${record.rn}, ${record.co}, ${record.no}, ${record.sourceMtime}, NOW(), NULL
      )
      ON CONFLICT ON CONSTRAINT records_natural_key DO UPDATE SET
        oy_record_id = NULL,
        work_id = EXCLUDED.work_id,
        ti = EXCLUDED.ti,
        ti_key = EXCLUDED.ti_key,
        ti_pinyin = EXCLUDED.ti_pinyin,
        st = EXCLUDED.st,
        st_pinyin = EXCLUDED.st_pinyin,
        pt = EXCLUDED.pt,
        pt_pinyin = EXCLUDED.pt_pinyin,
        fi = EXCLUDED.fi,
        sf = EXCLUDED.sf,
        tg = EXCLUDED.tg,
        ki = EXCLUDED.ki,
        tp = EXCLUDED.tp,
        yr = EXCLUDED.yr,
        pb = EXCLUDED.pb,
        ed = EXCLUDED.ed,
        sd = EXCLUDED.sd,
        vi = EXCLUDED.vi,
        si = EXCLUDED.si,
        rn = EXCLUDED.rn,
        co = EXCLUDED.co,
        no = EXCLUDED.no,
        source_mtime = EXCLUDED.source_mtime,
        imported_at = NOW(),
        deleted_at = NULL
      RETURNING id
    `;
    if (!stored)
      throw new Error(`レコードを保存できませんでした: ${record.nu}`);

    await replaceAuthors(sql, stored.id, record.authors);
    storedRecords.push({
      id: stored.id,
      faCode: record.faCode,
      collectionId,
      nu: record.nu,
      oyNu: record.oyNu,
    });
  }

  const resolution = resolveParentLinks(storedRecords);
  for (const link of resolution.links) {
    await sql`
      UPDATE records
      SET oy_record_id = ${link.oyRecordId}
      WHERE id = ${link.recordId}
    `;
  }

  let deletedCount = 0;
  const deletionWarnings: string[] = [];
  for (const deleted of input.deletedRecords) {
    const candidates = await sql<{ id: string }[]>`
      SELECT id FROM records
      WHERE fa_code = ${input.faCode} AND nu = ${deleted.nu} AND deleted_at IS NULL
    `;
    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      deletionWarnings.push(
        `nu=${deleted.nu}は複数のコレクションに存在するため削除をスキップしました`,
      );
      continue;
    }

    const [candidate] = candidates;
    if (!candidate) continue;
    await sql`
      UPDATE records SET deleted_at = NOW(), imported_at = NOW()
      WHERE id = ${candidate.id}
    `;
    deletedCount += 1;
  }

  return {
    faCode: input.faCode,
    importedCount: storedRecords.length,
    deletedCount,
    warnings: [
      ...resolution.warnings.map(
        ({ recordId, message }) => `${recordId}: ${message}`,
      ),
      ...deletionWarnings,
    ],
  };
}

/** 明示的な<se>タグを持つ文庫のみをCOLLECTIONSとしてマスタ化する。 */
async function getOrCreateCollection(
  sql: postgres.TransactionSql,
  faCode: string,
  name: string | null,
): Promise<string | null> {
  if (!name) return null;

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM collections WHERE fa_code = ${faCode} AND name = ${name}
  `;
  if (existing) return existing.id;

  const [created] = await sql<{ id: string }[]>`
    INSERT INTO collections (fa_code, name) VALUES (${faCode}, ${name})
    RETURNING id
  `;
  if (!created) throw new Error(`COLLECTIONSを作成できませんでした: ${name}`);
  return created.id;
}

async function getOrCreateWork(
  sql: postgres.TransactionSql,
  tiKey: string,
): Promise<string> {
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM works WHERE preferred_title = ${tiKey} ORDER BY id LIMIT 1
  `;
  if (existing) return existing.id;

  const [created] = await sql<{ id: string }[]>`
    INSERT INTO works (preferred_title) VALUES (${tiKey}) RETURNING id
  `;
  if (!created) throw new Error(`WORKSを作成できませんでした: ${tiKey}`);
  return created.id;
}

async function replaceAuthors(
  sql: postgres.TransactionSql,
  recordId: string,
  authors: ImportedRecord["authors"],
): Promise<void> {
  await sql`DELETE FROM authors WHERE record_id = ${recordId}`;

  for (const author of authors) {
    await sql`
      INSERT INTO authors (
        record_id, person_id, dynasty_text, name_text,
        name_pinyin, role_text, display_order
      ) VALUES (
        ${recordId}, NULL, ${author.dynastyText}, ${author.nameText},
        ${author.namePinyin}, ${author.roleText}, ${author.displayOrder}
      )
    `;
  }
}
