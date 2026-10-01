// 进度、星级、XP、连续打卡和错题本。纯函数，状态由调用方持久化。
//
// 评分标准：一个字「一次就打对」就算掌握，掌握了的字以后不再出现。
//   ★    打完一关（错字也重新打对了）→ 解锁下一关
//   ★★   本关掌握 80% 以上
//   ★★★  本关全部掌握
// 再练一关时只出还没掌握的字，所以把错字补对就能把星拿满。

export const DAILY_GOAL_XP = 30;
export const TWO_STAR = 0.8;

export function emptyState() {
  return {
    version: 2,
    stars: {},        // levelId -> 1..3（只升不降；有记录就代表打完过）
    mastered: {},     // itemKey -> true：一次打对过
    best: {},         // levelId -> { spm }
    xpByDay: {},      // 'YYYY-MM-DD' -> xp
    review: {},       // itemKey -> { due, jp }：错题本，一次打对就移除
    seenTraps: [],    // 已经弹过的陷阱卡
    trapHits: {},     // trapId -> 次数
    confusions: {},   // '打的韵母>正确韵母' -> 次数，例如 'ei>ai'
    settings: { lengthHint: false, sound: true, speak: false, rubricClosed: false },
  };
}

// 旧存档（v1）没有 mastered：打完过的关卡里，不在错题本中的字视为已掌握。
export function migrate(state, units) {
  if (state.version >= 2) return state;
  const next = { ...emptyState(), ...state, version: 2, mastered: { ...(state.mastered ?? {}) } };
  next.settings = { ...emptyState().settings, ...state.settings };
  for (const l of flatLevels(units)) {
    if (!(state.stars?.[l.id] > 0)) continue;
    for (const [zh] of l.items) if (!state.review?.[zh]) next.mastered[zh] = true;
  }
  for (const [key, r] of Object.entries(next.review)) next.review[key] = { due: r.due, jp: r.jp };
  return next;
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function mastery(state, level) {
  const total = level.items.length;
  const done = level.items.filter(([zh]) => state.mastered[zh]).length;
  return { done, total, ratio: total ? done / total : 0 };
}

export function starsForMastery(ratio) {
  if (ratio >= 1) return 3;
  if (ratio >= TWO_STAR) return 2;
  return 1;
}

// 本关还没掌握的字；全部掌握了就返回整关（自由练习）。
export function itemsToPractice(state, level) {
  const left = level.items.filter(([zh]) => !state.mastered[zh]);
  return left.length ? left : level.items;
}

// 每个字一次打对 1 分，每 5 连击奖励 1 分，打完一局再加 5。
export function xpFor(summary) {
  return summary.firstTry + Math.floor(summary.maxCombo / 5) + 5;
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

// 第一关永远开放，之后每关要求上一关打完过。
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
    .filter(([key, r]) => r.due <= today && !state.mastered[key])
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .slice(0, limit)
    .map(([key, r]) => ({ key, zh: key, syls: r.jp.split(' '), review: true }));
}

// 一局结束后合并结果，返回新状态和本局获得的东西（用于结算页）。
// level 为 null 表示单独的复习局。
export function applyResult(state, { level, summary, items, trapHits = [] }, today = dayKey()) {
  const next = structuredClone(state);
  const byKey = Object.fromEntries(items.map((it) => [it.key, it]));

  // 一次打对 → 掌握，从错题本移除，以后不再出；打错 → 进错题本，明天起混进练习。
  for (const key of summary.clearedKeys) {
    next.mastered[key] = true;
    delete next.review[key];
  }
  for (const key of summary.missedKeys) {
    if (next.mastered[key]) continue; // 掌握过的字偶尔手滑不算
    next.review[key] = { due: addDays(today, 1), jp: byKey[key].syls.join(' ') };
  }

  let stars = 0, prevStars = 0, prevBest = null, before = null, after = null;
  if (level) {
    before = mastery(state, level);
    after = mastery(next, level);
    prevStars = next.stars[level.id] ?? 0;
    stars = Math.max(prevStars, starsForMastery(after.ratio));
    next.stars[level.id] = stars;
    prevBest = next.best[level.id] ?? null;
    next.best[level.id] = { spm: Math.max(prevBest?.spm ?? 0, summary.spm) };
  }

  const xp = xpFor(summary);
  const hadToday = Boolean(next.xpByDay[today]);
  next.xpByDay[today] = (next.xpByDay[today] ?? 0) + xp;
  for (const id of trapHits) next.trapHits[id] = (next.trapHits[id] ?? 0) + 1;

  return {
    state: next,
    gained: {
      xp,
      stars,
      newStars: Math.max(0, stars - prevStars),
      masteredBefore: before?.done ?? 0,
      mastered: after?.done ?? 0,
      levelTotal: after?.total ?? 0,
      newSpmRecord: Boolean(prevBest?.spm) && summary.spm > prevBest.spm,
      streakStarted: !hadToday,
      streak: streak(next, today),
      goalReached: (state.xpByDay[today] ?? 0) < DAILY_GOAL_XP && next.xpByDay[today] >= DAILY_GOAL_XP,
    },
  };
}
