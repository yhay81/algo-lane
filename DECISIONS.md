# Decisions

## 2026-07-27 — 5問のレーンを中心に公開

- Status: active pilot
- Evidence: AtCoderの過去問には継続需要があり、タグや難易度から候補を探す既存手段は豊富だが、未ACを優先して次の5問だけへ絞る導線には余地がある。
- Decision: 全問題検索や長いタグ表を作らず、難易度・分野・公開AC履歴から5問を選ぶローカルファーストの作業画面を提供する。
- Dataset: AtCoder Problemsの公開メタデータを参照し、10分野・60問を手動選定。問題はAtCoderで開く。
- Privacy boundary: 練習情報とAtCoder IDはlocalStorageだけ。サーバーは匿名イベント名と日付だけ。
- Authentication: 所有者データや複数端末同期がないためBetter Authは使わない。
- Design: 大きな見出しや検証説明を置かず、難易度色でつながる5問のレーンを主役にする。
- Next review: 2026-08-27
