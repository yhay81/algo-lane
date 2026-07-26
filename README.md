# Algo Lane

難易度と分野を選び、次に解くAtCoderの5問だけを一本の練習レーンへ並べるWebアプリです。

## できること

- 5段階の難易度帯、10分野、3つの並べ方から5問を選択
- AC済みと復習待ちを端末内で記録
- 14日間の活動と分野別の取り組みを可視化
- 任意のAtCoder IDから公開AC履歴を読み込み、既出問題を候補から除外
- JSONバックアップの書き出しと復元
- インストール可能なPWAと、既に開いた画面のオフライン利用

選択条件、問題の状態、AtCoder ID、公開AC履歴はブラウザのlocalStorageへ保存し、Algo LaneのAPIへ送信しません。問題リンクはAtCoder、問題メタデータと公開提出履歴はAtCoder Problemsを利用します。

## 開発

Node.js 24 LTSとnpmを使用します。

```powershell
npm ci
npx wrangler d1 migrations apply algo-lane --local
npm run check
npm test
npm run build
npm run dev
```

## 運用

```powershell
npm run metrics
npm run deploy
npm run indexnow
```

技術構成は[STACK.md](./STACK.md)、検証判断は[EXPERIMENT.md](./EXPERIMENT.md)、データ境界は[PRIVACY.md](./PRIVACY.md)を参照してください。
