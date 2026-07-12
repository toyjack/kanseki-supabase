import type { RsyncChanges } from "./parse-rsync-changes";

export interface InstitutionChanges {
  faCode: string;
  changedRecordPaths: readonly string[];
  deletedRecordNus: readonly string[];
}

export interface ChangeMappingResult {
  institutions: readonly InstitutionChanges[];
  warnings: readonly string[];
}

const recordPathPattern = /^(FA[^/]+)\/tagged[^/]*\/([^/]+)\.dat$/;

/** rsyncの差分パスを、機関単位のETL対象(tagged*配下の.dat)へ対応付ける。 */
export function mapChangesToInstitutions(
  changes: RsyncChanges,
): ChangeMappingResult {
  const changedByFaCode = new Map<string, string[]>();
  const deletedByFaCode = new Map<string, string[]>();
  const warnings: string[] = [];

  for (const path of changes.transferredFiles) {
    const match = path.match(recordPathPattern);
    if (!match?.[1]) {
      warnings.push(`機関コードを特定できないパスを無視しました: ${path}`);
      continue;
    }
    const paths = changedByFaCode.get(match[1]) ?? [];
    paths.push(path);
    changedByFaCode.set(match[1], paths);
  }

  for (const path of changes.deletedFiles) {
    const match = path.match(recordPathPattern);
    if (!match?.[1] || !match[2]) {
      warnings.push(`機関コードを特定できないパスを無視しました: ${path}`);
      continue;
    }
    const nus = deletedByFaCode.get(match[1]) ?? [];
    nus.push(match[2]);
    deletedByFaCode.set(match[1], nus);
  }

  const faCodes = new Set([
    ...changedByFaCode.keys(),
    ...deletedByFaCode.keys(),
  ]);
  const institutions = [...faCodes].map((faCode) => ({
    faCode,
    changedRecordPaths: changedByFaCode.get(faCode) ?? [],
    deletedRecordNus: deletedByFaCode.get(faCode) ?? [],
  }));

  return { institutions, warnings };
}
