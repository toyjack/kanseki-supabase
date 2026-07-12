export interface RsyncChanges {
  transferredFiles: readonly string[];
  deletedFiles: readonly string[];
  warnings: readonly string[];
}

const transferredFilePattern = /^[<>]f.{9} (.+)$/;
const deletedPattern = /^\*deleting\s+(.+)$/;

/** rsync --itemize-changesの出力からDB処理対象の.datだけを抽出する。 */
export function parseRsyncChanges(output: string): RsyncChanges {
  const transferredFiles: string[] = [];
  const deletedFiles: string[] = [];
  const warnings: string[] = [];

  for (const rawLine of output.split(/\r?\n/u)) {
    if (!rawLine) continue;

    const transferred = rawLine.match(transferredFilePattern);
    if (transferred?.[1]) {
      addDatPath(transferred[1], transferredFiles, warnings);
      continue;
    }

    const deleted = rawLine.match(deletedPattern);
    if (deleted?.[1]) {
      addDatPath(deleted[1], deletedFiles, warnings);
    }
  }

  return {
    transferredFiles: unique(transferredFiles),
    deletedFiles: unique(deletedFiles),
    warnings,
  };
}

function addDatPath(
  path: string,
  destination: string[],
  warnings: string[],
): void {
  if (!path.endsWith(".dat")) return;
  if (!isSafeRelativePath(path)) {
    warnings.push(`安全でないパスを無視しました: ${path}`);
    return;
  }
  destination.push(path);
}

function isSafeRelativePath(path: string): boolean {
  if (path.startsWith("/") || path.includes("\\")) return false;
  return !path.split("/").some((part) => part === "..");
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
