# Privacy

## 端末内だけで扱うデータ

難易度、分野、並べ方、今日の5問、AC・復習の状態、活動履歴、AtCoder ID、読み込んだ公開AC問題IDはブラウザのlocalStorageへ保存します。これらをAlgo LaneのAPIへ送信しません。ブラウザのサイトデータを消すと削除できます。

JSONは利用者が操作したときにブラウザ内で生成します。JSONバックアップの復元もブラウザ内だけで処理します。

## 外部サービスへ送るデータ

利用者が公開AC履歴の読み込みを操作した場合だけ、ブラウザからAtCoder Problemsの公開APIへ入力したAtCoder IDを送信します。Algo Laneのサーバーを経由しません。問題を開くとAtCoderへ移動します。

## サーバーで扱うデータ

閲覧、5問生成、公開履歴読込、問題リンクを開く、AC記録、JSON書き出し、別日再訪のイベント名を、匿名UUIDのSHA-256ハッシュと日付に結び付けてD1へ保存します。AtCoder ID、問題ID、難易度、分野、検索条件、IPアドレスはD1へ保存しません。イベントは35日後に日次処理で削除します。

Cloudflareは配信と濫用防止のためにリクエストを処理します。外部解析SDK、広告Cookie、AI API、認証サービスは使用しません。

## 管理

- Operator: `yhay81`
- Security reports: GitHubのPrivate vulnerability reporting
- Source: https://github.com/yhay81/algo-lane
