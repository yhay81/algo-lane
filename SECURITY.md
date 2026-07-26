# Security Policy

## Reporting

脆弱性は公開Issueへ書かず、GitHubリポジトリのPrivate vulnerability reportingから報告してください。練習状態はサーバーに保持しないため、端末データの復旧依頼には対応できません。

## Baseline

- CSP、frame拒否、MIME sniffing拒否、最小権限のPermissions Policy
- Hono JSXによるHTMLエスケープ
- 匿名計測APIの同一サイト検査、厳密なschema、500 byte上限、rate limit
- セッションUUIDをSHA-256で一方向変換し、原値を保存しない
- D1イベントを35日で自動削除
- 公開AC読込のID形式・時間制限と、JSON復元の型・サイズ検査
- 外部スクリプト、外部フォント、認証、ユーザー生成HTMLなし
- 依存関係、Cloudflare互換日付、CI検査を固定
