// 进度、星级、XP、连续打卡和错题复习（Leitner 盒子）。纯函数，状态由调用方持久化。

export const DAILY_GOAL_XP = 30;
const REVIEW_GAPS = [1, 2, 4, 7, 15]; // 答对后下次复习间隔（天）

export function emptyState() {
  return {
    version: 1,
    stars: {},        // levelId -> 0..3（取最好成绩）
    best: {},         // levelId -> { accuracy, spm }
    xpByDay: {},      // 'YYYY-MM-DD' -> xp
    review: {},       // itemKey -> { box, due, jp }
    seenTraps: [],    // 已经弹过的陷阱卡
    trapHits: {},     // trapId -> 次数
    settings: { lengthHint: false, sound: true, speak: false },
  };
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

// 错的字都要重打对才能结束一局，所以打完就算过关（至少 1 星），星数只看一次打对的比例。
export function starsFor(accuracy) {
  if (accuracy >= 0.97) return 3;
  if (accuracy >= 0.9) return 2;
  return 1;
}

// 每个字首次打对 1 分，满连击奖励，过关再加。
export function xpFor(summary, stars) {
  return summary.firstTry + Math.floor(summary.maxCombo / 5) + (stars > 0 ? 5 : 2);
}

// 连续打卡天数：今天还没练不算断，从昨天往回数。
export function streak(state, today = dayKey()) {
  let day = state.xpByDay[today] ? today : addDays(today, -1);
  let n = 0;
  while (state.xpByDay[day]) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function flatLevels(units) {
  return units.flatMap((u) => u.levels.map((l) => ({ ...l, unit: u })));
}

// 第一关永远开放，之后每关要求上一关至少 1 星。
export function isUnlocked(state, units, levelId) {
  const all = flatLevels(units);
  const i = all.findIndex((l) => l.id === levelId);
  return i === 0 || (i > 0 && (state.stars[all[i - 1].id] ?? 0) > 0);
}

export function nextLevel(state, units) {
  const all = flatLevels(units);
  return all.find((l) => !(state.stars[l.id] > 0)) ?? all.find((l) => (state.stars[l.id] ?? 0) < 3) ?? all[all.length - 1];
}

export function dueReviews(state, today = dayKey(), limit = 6) {
  return Object.entries(state.review)
    .filter(([, r]) => r.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
    .slice(0, limit)
    .map(([key, r]) => ({ key, zh: key, syls: r.jp.split(' '), review: true }));
}

// 一局结束后合并结果，返回新状态和本局获得的东西（用于结算页）。
export function applyResult(state, { levelId, summary, items, trapHits = [] }, today = dayKey()) {
  const next = structuredClone(state);
  const stars = levelId ? starsFor(summary.accuracy) : 0;
  const prevStars = levelId ? next.stars[levelId] ?? 0 : 0;
  const prevBest = levelId ? next.best[levelId] : null;
  if (levelId) {
    next.stars[levelId] = Math.max(prevStars, stars);
    next.best[levelId] = {
      accuracy: Math.max(prevBest?.accuracy ?? 0, summary.accuracy),
      spm: Math.max(prevBest?.spm ?? 0, summary.spm),
    };
  }
  const xp = xpFor(summary, levelId ? stars : 1);
  const hadToday = Boolean(next.xpByDay[today]);
  next.xpByDay[today] = (next.xpByDay[today] ?? 0) + xp;

  const byKey = Object.fromEntries(items.map((it) => [it.key, it]));
  for (const key of summary.missedKeys) {
    next.review[key] = { box: 0, due: addDays(today, 1), jp: byKey[key].syls.join(' ') };
  }
  for (const key of summary.clearedKeys) {
    const r = next.review[key];
    if (!r || !byKey[key]?.review) continue;
    if (r.box + 1 >= REVIEW_GAPS.length) delete next.review[key];
    else next.review[key] = { ...r, box: r.box + 1, due: addDays(today, REVIEW_GAPS[r.box + 1]) };
  }
  for (const id of trapHits) next.trapHits[id] = (next.trapHits[id] ?? 0) + 1;

  return {
    state: next,
    gained: {
      xp,
      stars,
      newStars: Math.max(0, stars - prevStars),
      newSpmRecord: Boolean(prevBest) && summary.spm > prevBest.spm,
      streakStarted: !hadToday,
      streak: streak(next, today),
      goalReached: (state.xpByDay[today] ?? 0) < DAILY_GOAL_XP && next.xpByDay[today] >= DAILY_GOAL_XP,
    },
  };
}
