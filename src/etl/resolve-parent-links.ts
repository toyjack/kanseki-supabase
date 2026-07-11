export interface ParentCandidate {
  id: string;
  faCode: string;
  collectionId: string | null;
  nu: string;
  oyNu: string | null;
}

export interface ParentLink {
  recordId: string;
  oyRecordId: string;
}

export interface ParentWarning {
  recordId: string;
  message: string;
}

export interface ParentResolution {
  links: readonly ParentLink[];
  warnings: readonly ParentWarning[];
}

function naturalKey(
  faCode: string,
  collectionId: string | null,
  nu: string,
): string {
  return JSON.stringify([faCode, collectionId, nu]);
}

/** 2パス目で使用する親レコードIDを、入力順に依存せず解決する。 */
export function resolveParentLinks(
  records: readonly ParentCandidate[],
): ParentResolution {
  const byNaturalKey = new Map(
    records.map((record) => [
      naturalKey(record.faCode, record.collectionId, record.nu),
      record,
    ]),
  );
  const desiredParents = new Map<string, string>();
  const warnings: ParentWarning[] = [];

  for (const record of records) {
    if (!record.oyNu) continue;

    const parent = byNaturalKey.get(
      naturalKey(record.faCode, record.collectionId, record.oyNu),
    );
    if (!parent) {
      warnings.push({
        recordId: record.id,
        message: `親レコード${record.oyNu}が見つかりません`,
      });
      continue;
    }
    if (parent.id === record.id) {
      warnings.push({
        recordId: record.id,
        message: "自分自身を親レコードにはできません",
      });
      continue;
    }
    desiredParents.set(record.id, parent.id);
  }

  const cycleIds = findCycleIds(desiredParents);
  for (const recordId of cycleIds) {
    warnings.push({ recordId, message: "親子関係の循環を検出しました" });
  }

  const links = [...desiredParents]
    .filter(([recordId]) => !cycleIds.has(recordId))
    .map(([recordId, oyRecordId]) => ({ recordId, oyRecordId }));

  return { links, warnings };
}

function findCycleIds(parents: ReadonlyMap<string, string>): Set<string> {
  const cycleIds = new Set<string>();
  const completed = new Set<string>();

  for (const start of parents.keys()) {
    if (completed.has(start)) continue;

    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: string | undefined = start;

    while (current && !completed.has(current)) {
      const position = positions.get(current);
      if (position !== undefined) {
        for (const id of path.slice(position)) cycleIds.add(id);
        break;
      }
      positions.set(current, path.length);
      path.push(current);
      current = parents.get(current);
    }

    for (const id of path) completed.add(id);
  }

  return cycleIds;
}
