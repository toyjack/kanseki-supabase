export interface WorkCandidate {
  recordId: string;
  tiKey: string;
}

export interface WorkGroup {
  preferredTitle: string;
  recordIds: readonly string[];
}

/** 同一ti_keyのレコードを、手作業の名寄せを行わず仮グループ化する。 */
export function groupWorks(
  candidates: readonly WorkCandidate[],
): readonly WorkGroup[] {
  const groups = new Map<string, string[]>();

  for (const candidate of candidates) {
    const recordIds = groups.get(candidate.tiKey) ?? [];
    recordIds.push(candidate.recordId);
    groups.set(candidate.tiKey, recordIds);
  }

  return [...groups].map(([preferredTitle, recordIds]) => ({
    preferredTitle,
    recordIds,
  }));
}
