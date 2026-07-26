import { product } from "../config/product";
import { Layout } from "./layout";

const topics = [
  ["implementation", "実装"],
  ["search", "全探索"],
  ["string", "文字列"],
  ["math", "数学"],
  ["greedy", "貪欲法"],
  ["data_structure", "データ構造"],
  ["prefix_sum", "累積和"],
  ["binary_search", "二分探索"],
  ["graph", "グラフ"],
  ["dynamic_programming", "動的計画法"],
] as const;

const bands = [
  ["0", "399", "灰", "gray"],
  ["400", "799", "茶", "brown"],
  ["800", "1199", "緑", "green"],
  ["1200", "1599", "水", "cyan"],
  ["1600", "1999", "青", "blue"],
] as const;

export function HomePage() {
  return (
    <Layout>
      <section class="workspace-intro">
        <span class="app-symbol" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <div>
          <h1>{product.headline}</h1>
          <p>難易度と分野を選ぶと、未ACを優先して5問だけ並びます。</p>
        </div>
        <span class="local-badge">進捗と設定は端末内だけ</span>
      </section>

      <section class="summary-strip" aria-label="練習の集計">
        <div>
          <span>今日のレーン</span>
          <strong id="summary-lane">5問</strong>
        </div>
        <div>
          <span>端末でAC</span>
          <strong id="summary-solved">0問</strong>
        </div>
        <div>
          <span>復習待ち</span>
          <strong id="summary-review">0問</strong>
        </div>
        <div>
          <span>連続日数</span>
          <strong id="summary-streak">0日</strong>
        </div>
        <div class="pace-summary">
          <span>レーン進捗</span>
          <strong id="summary-progress">0 / 5</strong>
          <i>
            <b id="lane-progress"></b>
          </i>
        </div>
      </section>

      <div class="algo-workbench">
        <aside class="control-panel" aria-label="練習条件">
          <header class="panel-header">
            <h2>練習条件</h2>
            <output id="problem-count">60問</output>
          </header>

          <fieldset class="band-field">
            <legend>難易度帯</legend>
            <div class="band-row" id="rating-bands">
              {bands.map(([minimum, maximum, label, tone], index) => (
                <button
                  aria-pressed={index === 1 ? "true" : "false"}
                  class={`band-${tone}`}
                  data-max={maximum}
                  data-min={minimum}
                  type="button"
                >
                  <i></i>
                  <span>{label}</span>
                  <small>
                    {minimum}–{maximum}
                  </small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset class="topic-field">
            <legend>分野</legend>
            <div class="topic-grid" id="topic-grid">
              {topics.map(([value, label], index) => (
                <label>
                  <input checked={index < 4} name="topic" type="checkbox" value={value} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset class="mode-field">
            <legend>並べ方</legend>
            <div>
              <label>
                <input checked name="mode" type="radio" value="balanced" />
                <span>
                  <strong>均等</strong>
                  <small>易→難を混ぜる</small>
                </span>
              </label>
              <label>
                <input name="mode" type="radio" value="focus" />
                <span>
                  <strong>集中</strong>
                  <small>選んだ分野を揃える</small>
                </span>
              </label>
              <label>
                <input name="mode" type="radio" value="stretch" />
                <span>
                  <strong>背伸び</strong>
                  <small>上限寄りを2問入れる</small>
                </span>
              </label>
            </div>
          </fieldset>

          <button class="generate-button" id="generate-lane" type="button">
            5問を選び直す
          </button>

          <section class="history-import" aria-labelledby="history-title">
            <header>
              <h3 id="history-title">公開ACを除外</h3>
              <span>任意</span>
            </header>
            <div>
              <label class="visually-hidden" for="atcoder-id">
                AtCoder ID
              </label>
              <input
                autocomplete="off"
                id="atcoder-id"
                maxlength={32}
                placeholder="AtCoder ID"
                spellcheck={false}
              />
              <button id="import-history" type="button">
                読み込む
              </button>
            </div>
            <p id="import-status">
              AtCoder Problemsの公開提出をブラウザから取得し、AC済みを候補から外します。
            </p>
          </section>
        </aside>

        <section class="lane-panel" aria-labelledby="lane-title">
          <header class="lane-heading">
            <div>
              <span>5 PROBLEMS</span>
              <h2 id="lane-title">今日のレーン</h2>
            </div>
            <div>
              <button id="copy-lane" type="button">
                一覧をコピー
              </button>
              <button id="clear-lane" type="button">
                状態を戻す
              </button>
            </div>
          </header>
          <ol class="problem-lane" id="problem-lane"></ol>
          <div class="rating-legend" aria-label="難易度の色">
            <span>
              <i class="tone-gray"></i>灰
            </span>
            <span>
              <i class="tone-brown"></i>茶
            </span>
            <span>
              <i class="tone-green"></i>緑
            </span>
            <span>
              <i class="tone-cyan"></i>水
            </span>
            <span>
              <i class="tone-blue"></i>青
            </span>
            <small>推定難易度はAtCoder Problemsを参照</small>
          </div>
        </section>

        <aside class="progress-panel" aria-label="練習の振り返り">
          <section class="week-card" aria-labelledby="week-title">
            <header class="panel-header">
              <h2 id="week-title">14日</h2>
              <output id="week-total">0 AC</output>
            </header>
            <div class="activity-grid" id="activity-grid"></div>
          </section>

          <section class="coverage-card" aria-labelledby="coverage-title">
            <header class="panel-header">
              <h2 id="coverage-title">分野の足跡</h2>
              <span>端末で記録</span>
            </header>
            <div class="coverage-list" id="coverage-list"></div>
          </section>

          <section class="review-card" aria-labelledby="review-title">
            <header class="panel-header">
              <h2 id="review-title">復習待ち</h2>
              <output id="review-count">0問</output>
            </header>
            <div class="review-list" id="review-list"></div>
          </section>

          <section class="data-actions" aria-labelledby="data-title">
            <header>
              <h2 id="data-title">持ち出し</h2>
            </header>
            <div>
              <button id="export-json" type="button">
                JSON保存
              </button>
              <label>
                JSON復元
                <input accept="application/json,.json" id="import-json" type="file" />
              </label>
            </div>
          </section>

          <p class="source-note">
            問題は
            <a href="https://atcoder.jp/" rel="noreferrer">
              AtCoder
            </a>
            で解きます。問題名・難易度は
            <a href="https://kenkoooo.com/atcoder/" rel="noreferrer">
              AtCoder Problems
            </a>
            の公開データを使用しています。
          </p>
        </aside>
      </div>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout page="privacy" title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <h1>練習状態は、この端末の中で扱います</h1>
        <h2>サーバーへ送らないもの</h2>
        <p>
          選んだ難易度と分野、今日の5問、AC・復習の記録、AtCoder
          ID、読み込んだ公開AC問題IDはブラウザのlocalStorageへ保存し、Algo LaneのAPIへ送信しません。
        </p>
        <h2>公開AC履歴の読み込み</h2>
        <p>
          利用者が操作した場合だけ、ブラウザからAtCoder Problemsの公開APIへAtCoder
          IDを送り、公開提出履歴を取得します。Algo
          Laneのサーバーを経由せず、取得結果はこの端末だけへ保存します。
        </p>
        <h2>匿名で集計するもの</h2>
        <p>
          閲覧、5問生成、公開履歴読込、問題リンクを開く、AC記録、JSON書き出し、別日再訪を、匿名識別子を一方向変換して日単位で記録します。AtCoder
          ID、問題ID、難易度、分野、検索条件、IPアドレスはD1へ保存せず、匿名集計は35日後に削除します。
        </p>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout page="not-found" title={`見つかりません | ${product.name}`}>
      <section class="not-found">
        <span aria-hidden="true">● ━ ● ━ ●</span>
        <h1>ページが見つかりません</h1>
        <p>練習レーンへ戻って、次の5問を選べます。</p>
        <a href="/">練習レーンへ戻る</a>
      </section>
    </Layout>
  );
}
