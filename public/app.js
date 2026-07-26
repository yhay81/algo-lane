const storageKey = "algo-lane:v1";
const topicLabels = {
  implementation: "実装",
  search: "全探索",
  string: "文字列",
  math: "数学",
  greedy: "貪欲法",
  data_structure: "データ構造",
  prefix_sum: "累積和",
  binary_search: "二分探索",
  graph: "グラフ",
  dynamic_programming: "動的計画法",
};
const defaultTopics = ["implementation", "search", "string", "math"];
const modeTargets = {
  balanced: [0.08, 0.3, 0.5, 0.72, 0.94],
  focus: [0.45, 0.5, 0.55, 0.6, 0.65],
  stretch: [0.1, 0.35, 0.6, 0.9, 1.18],
};

function createDefaultState() {
  return {
    min: 400,
    max: 799,
    topics: [...defaultTopics],
    mode: "balanced",
    lane: [],
    solved: [],
    review: [],
    history: [],
    importedSolved: [],
    importedUser: "",
    generation: 0,
    sessionId: crypto.randomUUID(),
    lastSeen: "",
  };
}

function readState() {
  const fallback = createDefaultState();
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      ...fallback,
      ...parsed,
      topics: Array.isArray(parsed.topics)
        ? parsed.topics.filter((topic) => topic in topicLabels)
        : fallback.topics,
      lane: Array.isArray(parsed.lane) ? parsed.lane.filter((id) => typeof id === "string") : [],
      solved: Array.isArray(parsed.solved)
        ? parsed.solved.filter((id) => typeof id === "string")
        : [],
      review: Array.isArray(parsed.review)
        ? parsed.review.filter((id) => typeof id === "string")
        : [],
      importedSolved: Array.isArray(parsed.importedSolved)
        ? parsed.importedSolved.filter((id) => typeof id === "string")
        : [],
      history: Array.isArray(parsed.history)
        ? parsed.history.filter(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              typeof entry.date === "string" &&
              typeof entry.problemId === "string",
          )
        : [],
      sessionId:
        typeof parsed.sessionId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          parsed.sessionId,
        )
          ? parsed.sessionId
          : fallback.sessionId,
    };
  } catch {
    return fallback;
  }
}

let state = readState();
let problems = [];

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function track(name) {
  fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, sessionId: state.sessionId }),
    keepalive: true,
  }).catch(() => {});
}

function utcDate(offset = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function markVisit() {
  const today = utcDate();
  track("visited");
  if (state.lastSeen && state.lastSeen !== today) track("returned");
  state.lastSeen = today;
  saveState();
}

function normalizedDifficulty(raw) {
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw < 400 ? 400 / Math.exp((400 - raw) / 400) : raw);
}

function toneFor(difficulty) {
  if (difficulty < 400) return "gray";
  if (difficulty < 800) return "brown";
  if (difficulty < 1200) return "green";
  if (difficulty < 1600) return "cyan";
  if (difficulty < 2000) return "blue";
  return "yellow";
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseLane() {
  const selectedTopics = state.topics.length ? state.topics : Object.keys(topicLabels);
  const excluded = new Set([...state.solved, ...state.importedSolved]);
  let pool = problems.filter(
    (problem) =>
      selectedTopics.includes(problem.topic) &&
      problem.difficulty >= state.min &&
      problem.difficulty <= state.max &&
      !excluded.has(problem.id),
  );

  if (pool.length < 5) {
    pool = problems.filter(
      (problem) =>
        selectedTopics.includes(problem.topic) &&
        problem.difficulty >= Math.max(0, state.min - 400) &&
        problem.difficulty <= state.max + 400 &&
        !excluded.has(problem.id),
    );
  }
  if (pool.length < 5) {
    pool = problems.filter(
      (problem) =>
        selectedTopics.includes(problem.topic) &&
        problem.difficulty >= Math.max(0, state.min - 400) &&
        problem.difficulty <= state.max + 400,
    );
  }

  const seedBase = `${utcDate()}:${state.generation}:${state.min}:${state.max}:${state.mode}`;
  const used = new Set();
  const targets = modeTargets[state.mode] || modeTargets.balanced;
  const width = Math.max(1, state.max - state.min);
  const lane = [];

  for (const ratio of targets) {
    const target = state.min + width * ratio;
    const candidate = pool
      .filter((problem) => !used.has(problem.id))
      .sort((left, right) => {
        const difference = Math.abs(left.difficulty - target) - Math.abs(right.difficulty - target);
        if (difference !== 0) return difference;
        return hashString(`${seedBase}:${left.id}`) - hashString(`${seedBase}:${right.id}`);
      })[0];
    if (candidate) {
      used.add(candidate.id);
      lane.push(candidate.id);
    }
  }

  state.lane = lane;
  saveState();
}

function problemUrl(problem) {
  return `https://atcoder.jp/contests/${problem.contest}/tasks/${problem.id}?lang=ja`;
}

function getProblem(id) {
  return problems.find((problem) => problem.id === id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLane() {
  const lane = document.querySelector("#problem-lane");
  lane.innerHTML = state.lane
    .map((id, index) => {
      const problem = getProblem(id);
      if (!problem) return "";
      const solved = state.solved.includes(id);
      const review = state.review.includes(id);
      const tone = toneFor(problem.difficulty);
      return `
        <li class="problem-card${solved ? " is-solved" : ""}" data-problem-id="${escapeHtml(id)}">
          <div class="lane-node tone-${tone}" aria-hidden="true"><span>${index + 1}</span></div>
          <div class="problem-body">
            <div class="problem-meta">
              <span>${escapeHtml(problem.contest.toUpperCase())}</span>
              <span class="difficulty tone-${tone}">${problem.difficulty}</span>
              <span>${escapeHtml(topicLabels[problem.topic] || problem.topic)}</span>
            </div>
            <h3>${escapeHtml(problem.title)}</h3>
            <p>${escapeHtml(problem.id)} · 推定難易度 ${problem.difficulty}</p>
          </div>
          <div class="problem-actions">
            <a data-open-problem href="${problemUrl(problem)}" rel="noreferrer" target="_blank">問題を開く</a>
            <button aria-pressed="${solved}" data-toggle-solved type="button">${solved ? "AC済み" : "AC"}</button>
            <button aria-pressed="${review}" data-toggle-review type="button">${review ? "復習中" : "復習"}</button>
          </div>
        </li>`;
    })
    .join("");
}

function currentLaneSolved() {
  return state.lane.filter((id) => state.solved.includes(id)).length;
}

function streak() {
  const dates = new Set(state.history.map((entry) => entry.date));
  let count = 0;
  for (let offset = 0; offset > -365; offset -= 1) {
    if (!dates.has(utcDate(offset))) break;
    count += 1;
  }
  return count;
}

function renderSummary() {
  const solved = currentLaneSolved();
  document.querySelector("#summary-lane").textContent = `${state.lane.length}問`;
  document.querySelector("#summary-solved").textContent = `${state.solved.length}問`;
  document.querySelector("#summary-review").textContent = `${state.review.length}問`;
  document.querySelector("#summary-streak").textContent = `${streak()}日`;
  document.querySelector("#summary-progress").textContent = `${solved} / ${state.lane.length}`;
  document.querySelector("#lane-progress").className = `progress-${solved}`;
}

function renderActivity() {
  const counts = new Map();
  for (const entry of state.history) counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
  const cells = [];
  let total = 0;
  for (let offset = -13; offset <= 0; offset += 1) {
    const date = utcDate(offset);
    const count = counts.get(date) || 0;
    total += count;
    const activity = Math.min(4, count);
    cells.push(
      `<span class="activity-${activity}" title="${date}: ${count} AC"><i>${date.slice(5).replace("-", "/")}</i><b>${count}</b></span>`,
    );
  }
  document.querySelector("#activity-grid").innerHTML = cells.join("");
  document.querySelector("#week-total").textContent = `${total} AC`;
}

function renderCoverage() {
  const counts = {};
  for (const entry of state.history) {
    const problem = getProblem(entry.problemId);
    if (problem) counts[problem.topic] = (counts[problem.topic] || 0) + 1;
  }
  const maximum = Math.max(1, ...Object.values(counts));
  document.querySelector("#coverage-list").innerHTML = Object.entries(topicLabels)
    .map(([topic, label]) => {
      const count = counts[topic] || 0;
      const width = Math.round((count / maximum) * 10);
      return `<div><span>${label}</span><i><b class="bar-${width}"></b></i><output>${count}</output></div>`;
    })
    .join("");
}

function renderReview() {
  const list = state.review.map(getProblem).filter(Boolean).slice(0, 8);
  document.querySelector("#review-count").textContent = `${state.review.length}問`;
  document.querySelector("#review-list").innerHTML = list.length
    ? list
        .map(
          (problem) => `
            <div data-problem-id="${escapeHtml(problem.id)}">
              <a href="${problemUrl(problem)}" rel="noreferrer" target="_blank">
                <span>${escapeHtml(problem.contest.toUpperCase())}</span>
                <strong>${escapeHtml(problem.title)}</strong>
              </a>
              <button aria-label="${escapeHtml(problem.title)}を復習から外す" data-remove-review type="button">×</button>
            </div>`,
        )
        .join("")
    : '<p class="empty-state">旗を立てた問題がここに並びます。</p>';
}

function renderControls() {
  for (const button of document.querySelectorAll("#rating-bands button")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.min) === state.min && Number(button.dataset.max) === state.max),
    );
  }
  for (const input of document.querySelectorAll('input[name="topic"]')) {
    input.checked = state.topics.includes(input.value);
  }
  for (const input of document.querySelectorAll('input[name="mode"]')) {
    input.checked = input.value === state.mode;
  }
  document.querySelector("#atcoder-id").value = state.importedUser;
  if (state.importedUser) {
    document.querySelector("#import-status").textContent =
      `${state.importedUser} のAC済み ${state.importedSolved.length}問を候補から除外中`;
  }
}

function renderAll() {
  renderControls();
  renderLane();
  renderSummary();
  renderActivity();
  renderCoverage();
  renderReview();
}

function toggleSolved(id) {
  if (state.solved.includes(id)) {
    state.solved = state.solved.filter((problemId) => problemId !== id);
    state.history = state.history.filter((entry) => entry.problemId !== id);
  } else {
    state.solved.push(id);
    state.history.push({ date: utcDate(), problemId: id });
    track("solved_marked");
  }
  saveState();
  renderAll();
}

function toggleReview(id) {
  state.review = state.review.includes(id)
    ? state.review.filter((problemId) => problemId !== id)
    : [id, ...state.review];
  saveState();
  renderAll();
}

function generateAndRender(trackEvent = true) {
  state.generation += 1;
  chooseLane();
  renderAll();
  if (trackEvent) track("lane_generated");
}

async function importHistory() {
  const input = document.querySelector("#atcoder-id");
  const status = document.querySelector("#import-status");
  const user = input.value.trim();
  if (!/^[A-Za-z0-9_]{1,32}$/.test(user)) {
    status.textContent = "AtCoder IDは英数字とアンダースコアで入力してください。";
    input.focus();
    return;
  }
  status.textContent = "公開提出を読み込んでいます…";
  const button = document.querySelector("#import-history");
  button.disabled = true;
  try {
    const endpoint = new URL("https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions");
    endpoint.searchParams.set("user", user);
    endpoint.searchParams.set("from_second", "0");
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("request_failed");
    const submissions = await response.json();
    if (!Array.isArray(submissions)) throw new Error("invalid_response");
    const solved = new Set(
      submissions
        .filter((entry) => entry && entry.result === "AC" && typeof entry.problem_id === "string")
        .map((entry) => entry.problem_id),
    );
    state.importedSolved = [...solved];
    state.importedUser = user;
    saveState();
    status.textContent = `${user} のAC済み ${solved.size}問を候補から除外しました。`;
    generateAndRender(false);
    track("history_imported");
  } catch {
    status.textContent = "公開提出を取得できませんでした。時間をおいて再度お試しください。";
  } finally {
    button.disabled = false;
  }
}

function downloadJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      min: state.min,
      max: state.max,
      topics: state.topics,
      mode: state.mode,
      lane: state.lane,
      solved: state.solved,
      review: state.review,
      history: state.history,
      importedSolved: state.importedSolved,
      importedUser: state.importedUser,
      generation: state.generation,
    },
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `algo-lane-${utcDate()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  track("exported");
}

async function restoreJson(file) {
  if (!file || file.size > 1024 * 1024) {
    alert("1MB以下のAlgo Lane JSONを選んでください。");
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    const data = payload?.version === 1 ? payload.data : null;
    if (
      !data ||
      !Number.isInteger(data.min) ||
      !Number.isInteger(data.max) ||
      !Array.isArray(data.topics) ||
      !Array.isArray(data.lane) ||
      !Array.isArray(data.solved) ||
      !Array.isArray(data.review) ||
      !Array.isArray(data.history) ||
      !Array.isArray(data.importedSolved) ||
      !["balanced", "focus", "stretch"].includes(data.mode)
    ) {
      throw new Error("invalid");
    }
    const knownIds = new Set(problems.map((problem) => problem.id));
    state = {
      ...createDefaultState(),
      min: Math.max(0, Math.min(1999, data.min)),
      max: Math.max(0, Math.min(1999, data.max)),
      topics: data.topics.filter((topic) => topic in topicLabels),
      mode: data.mode,
      lane: data.lane.filter((id) => knownIds.has(id)).slice(0, 5),
      solved: data.solved.filter((id) => knownIds.has(id)),
      review: data.review.filter((id) => knownIds.has(id)),
      history: data.history.filter(
        (entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && knownIds.has(entry.problemId),
      ),
      importedSolved: data.importedSolved.filter((id) => typeof id === "string"),
      importedUser:
        typeof data.importedUser === "string" && /^[A-Za-z0-9_]{0,32}$/.test(data.importedUser)
          ? data.importedUser
          : "",
      generation: Number.isInteger(data.generation) ? data.generation : 0,
      sessionId: crypto.randomUUID(),
      lastSeen: utcDate(),
    };
    if (!state.lane.length) chooseLane();
    saveState();
    renderAll();
  } catch {
    alert("Algo Laneから保存したJSONを読み込めませんでした。");
  }
}

function bindEvents() {
  document.querySelector("#rating-bands").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-min]");
    if (!button) return;
    state.min = Number(button.dataset.min);
    state.max = Number(button.dataset.max);
    generateAndRender(false);
  });

  document.querySelector("#topic-grid").addEventListener("change", () => {
    state.topics = [...document.querySelectorAll('input[name="topic"]:checked')].map(
      (input) => input.value,
    );
    generateAndRender(false);
  });

  document.querySelector(".mode-field").addEventListener("change", (event) => {
    if (event.target.name !== "mode") return;
    state.mode = event.target.value;
    generateAndRender(false);
  });

  document.querySelector("#generate-lane").addEventListener("click", () => generateAndRender());
  document.querySelector("#import-history").addEventListener("click", importHistory);
  document.querySelector("#atcoder-id").addEventListener("keydown", (event) => {
    if (event.key === "Enter") void importHistory();
  });

  document.querySelector("#problem-lane").addEventListener("click", (event) => {
    const card = event.target.closest("[data-problem-id]");
    if (!card) return;
    if (event.target.closest("[data-toggle-solved]")) toggleSolved(card.dataset.problemId);
    if (event.target.closest("[data-toggle-review]")) toggleReview(card.dataset.problemId);
    if (event.target.closest("[data-open-problem]")) track("problem_opened");
  });

  document.querySelector("#review-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-problem-id]");
    if (row && event.target.closest("[data-remove-review]")) toggleReview(row.dataset.problemId);
  });

  document.querySelector("#copy-lane").addEventListener("click", async (event) => {
    const lines = state.lane
      .map(getProblem)
      .filter(Boolean)
      .map((problem, index) => `${index + 1}. ${problem.title} ${problemUrl(problem)}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      event.currentTarget.textContent = "コピーしました";
      setTimeout(() => {
        event.currentTarget.textContent = "一覧をコピー";
      }, 1600);
    } catch {
      event.currentTarget.textContent = "コピーできません";
    }
  });

  document.querySelector("#clear-lane").addEventListener("click", () => {
    if (!confirm("現在の5問につけたAC・復習の状態だけを戻しますか？")) return;
    const laneIds = new Set(state.lane);
    state.solved = state.solved.filter((id) => !laneIds.has(id));
    state.review = state.review.filter((id) => !laneIds.has(id));
    state.history = state.history.filter((entry) => !laneIds.has(entry.problemId));
    saveState();
    renderAll();
  });

  document.querySelector("#export-json").addEventListener("click", downloadJson);
  document.querySelector("#import-json").addEventListener("change", (event) => {
    void restoreJson(event.target.files?.[0]);
    event.target.value = "";
  });
}

async function boot() {
  markVisit();
  if (!document.querySelector("#problem-lane")) return;
  try {
    const response = await fetch("/problems.json");
    if (!response.ok) throw new Error("dataset_failed");
    const rawProblems = await response.json();
    if (!Array.isArray(rawProblems) || rawProblems.length < 50) throw new Error("dataset_invalid");
    problems = rawProblems.map((problem) => ({
      ...problem,
      difficulty: normalizedDifficulty(problem.difficulty),
    }));
    document.querySelector("#problem-count").textContent = `${problems.length}問`;
    state.lane = state.lane.filter((id) => problems.some((problem) => problem.id === id));
    if (state.lane.length < 5) chooseLane();
    bindEvents();
    renderAll();
  } catch {
    document.querySelector("#problem-lane").innerHTML =
      '<li class="load-error">問題データを読み込めませんでした。ページを再読み込みしてください。</li>';
  }
}

void boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
