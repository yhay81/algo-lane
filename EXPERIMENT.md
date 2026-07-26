# Experiment

## User and job

- Target user: AtCoderの過去問を継続して解きたいが、一覧やタグ表から次の一問を毎回選ぶことに疲れている人
- Job to be done: 今の難易度と練習したい分野に合う未AC問題を、迷わず5問に絞る
- Current workaround: AtCoder Problemsやタグ一覧を見比べ、提出履歴を思い出しながら手で候補を選ぶ

## Hypothesis

難易度、分野、公開AC履歴から候補を5問だけに絞り、ACと復習状態を軽く残せれば、競技プログラミング学習者は問題リンクを開き、別の日にも戻る。

## Method

- Recruitment channel: Tool Shelf、GitHub、検索流入
- Duration: 公開から30日
- Comparison: 訪問、5問選び直し、公開AC履歴読込、問題リンクを開く、AC記録、書き出し、別日再訪の匿名集計
- Scope: 60問の手動選定データとブラウザ内状態。全問題検索、解説生成、提出代行、アカウント同期は追加しない

## Decision

- Success signal: 30日以内に20人以上が訪問し、10人以上が問題を開き、5人以上がACを記録し、3人以上が別日に再訪
- Improve signal: 問題を開く利用者がいるのにAC記録率が25%未満なら、完了操作と復習導線を見直す
- Failure signal: 運営者以外とみなせる問題リンク利用者が30日で3人未満
- Deadline: 2026-08-27
- Maximum monthly infrastructure cost: Cloudflare無料枠内

## Guardrails

- AtCoder ID、問題ID、難易度、分野、AC・復習状態をAlgo Laneのサーバーへ送信しない。
- AtCoderまたはAtCoder Problemsの公式サービスであるかのように表示しない。
- 利用数のために匿名性、35日削除、CSP、rate limitを弱めない。
- 検証条件や競合への言及をサービス画面へ表示しない。
