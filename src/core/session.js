// 一局练习的状态机。不碰 DOM，UI 只调用 submit() 并根据返回的事件做动画。
import { findTrap } from './traps.js';

// 用户可能顺手打了声调数字、大写或多余符号，统一去掉。
export function normalize(s) {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

// IME 实战关：只比较汉字本身，忽略标点和空白。
export function normalizeHanzi(s) {
  return s.replace(/[\s\p{P}\p{S}a-zA-Z0-9]/gu, '');
}

export function toItem([zh, jp], extra = {}) {
  return { key: zh, zh, syls: jp.split(' '), ...extra };
}

export function createSession(items, { mode = 'type', now = Date.now() } = {}) {
  const queue = items.map((it) => ({ ...it, retry: false, missed: false }));
  const s = {
    mode,
    queue,
    total: items.length,
    pos: 0,
    syl: 0,
    attempts: 0,
    revealed: false,
    combo: 0,
    maxCombo: 0,
    firstTry: 0,
    sylCount: 0,
    missedKeys: [],
    clearedKeys: [],
    startedAt: now,
    finishedAt: null,
  };
  return s;
}

export const current = (s) => s.queue[s.pos] ?? null;
export const isDone = (s) => s.pos >= s.queue.length;
export const progress = (s) => Math.min(1, s.queue.filter((it, i) => i < s.pos && !it.retry).length / s.total);

function finishItem(s, it, now) {
  if (!it.retry) {
    if (it.missed) {
      s.missedKeys.push(it.key);
      s.queue.push({ ...it, retry: true, missed: false });
    } else {
      s.firstTry += 1;
      s.clearedKeys.push(it.key);
    }
  }
  s.pos += 1;
  s.syl = 0;
  s.attempts = 0;
  s.revealed = false;
  if (isDone(s)) s.finishedAt = now;
}

function answerOf(s, it) {
  return s.mode === 'ime' ? it.zh : it.syls[s.syl];
}

// 返回 { type: 'correct' | 'wrong' | 'reveal' | 'ignored', ... }
export function submit(s, raw, now = Date.now()) {
  const it = current(s);
  if (!it) return { type: 'ignored' };
  const typed = s.mode === 'ime' ? normalizeHanzi(raw) : normalize(raw);
  if (!typed) return { type: 'ignored' };
  const answer = answerOf(s, it);

  if (typed === (s.mode === 'ime' ? normalizeHanzi(answer) : answer)) {
    const clean = s.attempts === 0;
    s.combo = clean ? s.combo + 1 : 0;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.sylCount += s.mode === 'ime' ? it.syls.length : 1;
    const ev = { type: 'correct', clean, combo: s.combo, sylIndex: s.syl, itemDone: false, sessionDone: false };
    s.attempts = 0;
    s.revealed = false;
    if (s.mode === 'ime' || s.syl + 1 >= it.syls.length) {
      ev.itemDone = true;
      ev.item = it;
      finishItem(s, it, now);
      ev.sessionDone = isDone(s);
    } else {
      s.syl += 1;
    }
    return ev;
  }

  s.attempts += 1;
  s.combo = 0;
  it.missed = true;
  const trap = s.mode === 'ime' ? null : findTrap(typed, answer);
  if (s.attempts >= 2 || s.revealed) {
    s.revealed = true;
    return { type: 'reveal', answer, trap, typed, sylIndex: s.syl };
  }
  return { type: 'wrong', trap, typed, sylIndex: s.syl };
}

export function summary(s) {
  const ms = (s.finishedAt ?? Date.now()) - s.startedAt;
  const minutes = Math.max(ms / 60000, 1 / 60);
  // 复习题混在关卡里时，星级只按本关的新题算。
  const main = s.queue.filter((it) => !it.retry && !it.review);
  const scored = main.length ? main : s.queue.filter((it) => !it.retry);
  const firstTry = scored.filter((it) => s.clearedKeys.includes(it.key)).length;
  return {
    total: scored.length,
    firstTry,
    accuracy: scored.length ? firstTry / scored.length : 0,
    maxCombo: s.maxCombo,
    spm: Math.round(s.sylCount / minutes),
    seconds: Math.round(ms / 1000),
    missedKeys: s.missedKeys,
    clearedKeys: s.clearedKeys,
  };
}
