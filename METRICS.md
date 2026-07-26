# Metrics

匿名のUUIDをSHA-256で一方向変換し、イベント名と日付だけをD1へ保存します。AtCoder ID、問題ID、難易度、分野、検索条件、AC・復習状態、IPアドレスは保存しません。同じ匿名利用者・イベント・日付は一件にまとめ、35日後に削除します。

| Event              | Meaning                            |
| ------------------ | ---------------------------------- |
| `visited`          | 練習レーンまたは関連ページを開いた |
| `lane_generated`   | 5問を選び直した                    |
| `history_imported` | 公開AC履歴を読み込んだ             |
| `problem_opened`   | AtCoderの問題リンクを開いた        |
| `solved_marked`    | 問題をAC済みとして記録した         |
| `exported`         | JSONを書き出した                   |
| `returned`         | 別の日に再訪した                   |

中核成果は`solved_marked`です。`npm run metrics`は全期間と直近7日の人数、各段階の人数と転換率をJSONで返します。利用者の入力内容や個別識別子は出力しません。
