import { parseRsyncChanges, type RsyncChanges } from "./parse-rsync-changes";

export interface RsyncOptions {
  source: string;
  destination: string;
}

/** 読み取り元の内容をローカルミラーへ同期する引数を生成する。 */
export function buildRsyncArguments(options: RsyncOptions): readonly string[] {
  if (!options.source.trim())
    throw new Error("RSYNC_SOURCEが設定されていません");
  if (!options.destination.trim()) {
    throw new Error("RSYNC_DESTINATIONが設定されていません");
  }

  return [
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
    withTrailingSlash(options.source),
    withTrailingSlash(options.destination),
  ];
}

/** rsyncをシェルを介さず実行し、変更された.datを返す。 */
export async function runRsync(options: RsyncOptions): Promise<RsyncChanges> {
  const process = Bun.spawn(["rsync", ...buildRsyncArguments(options)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `rsyncが終了コード${exitCode}で失敗しました: ${stderr.trim()}`,
    );
  }

  return parseRsyncChanges(stdout);
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
