# kanseki-supabase

全国漢籍データベースの書誌データを保存し、PostgreSQL + PGroongaによる検索と、レガシー`tagged/*.dat`からの定期取込みを提供するサーバーです。

## 必要環境

- Bun 1.3以降
- Docker（データベース実装後に使用）

## 開発コマンド

```sh
bun install
bun test
bun run test:database
bun run lint
bun run typecheck
```

- `bun test`: 自動テストを実行します。
- `bun run test:database`: `.env`の接続先に対し、ロールバックされる結合テストを実行します。
- `bun run lint`: Biomeでコードと設定を検査します。
- `bun run typecheck`: TypeScriptの型を検査します。

## ディレクトリ構成

- `src/etl/`: レガシーデータの復号・解析・正規化処理
- `src/sync/`: rsyncの差分抽出処理
- `supabase/migrations/`: PostgreSQL・PGroongaのマイグレーション
- `tests/`: 受け入れ基準に対応する自動テスト
- `specs/`: 要件と設計の基準文書
- `tasks.md`: 実装状況と受け入れ基準

実装時は先に`specs/`を確認し、未決定事項を推測で補わないでください。

## データベース

`supabase/migrations/`のSQLはself-hosted Supabase向けです。実環境へ適用する前に、接続先が検証環境であることと、PGroongaが利用可能であることを確認してください。

接続情報は`.env.example`を参考に`.env`へ保存します。`.env`には認証情報が含まれるため、Gitへ追加しないでください。

rsyncのローカルミラーはリポジトリ内の`data/rsync-mirror/`を使用します。このディレクトリはGitの追跡対象外です。日次処理はリポジトリのルートを作業ディレクトリとして実行してください。

`RSYNC_SOURCE`には`FA*`ディレクトリを直下に持つデータルートを指定します。同期対象は`FA*/organization`と`FA*/tagged*/*.dat`だけで、画像や生データは除外します。
