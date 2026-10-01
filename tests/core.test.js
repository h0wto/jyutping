import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTrap } from '../src/core/traps.js';
import { createSession, submit, summary, toItem, normalize, isDone, current } from '../src/core/session.js';
import { emptyState, applyResult, streak, starsForMastery, isUnlocked, dueReviews, addDays, itemsToPractice, migrate } from '../src/core/progress.js';

test('陷阱识别：常见普通话习惯错误', () => {
  assert.equal(findTrap('yat', 'jat'), 'j-is-y');
  assert.equal(findTrap('zhi', 'zi'), 'zcs');
  assert.equal(findTrap('xin', 'sam'), 'zcs');
  assert.equal(findTrap('hiong', 'hoeng'), 'oe-eo');
  assert.equal(findTrap('heong', 'hoeng'), 'oe-eo');
  assert.equal(findTrap('gai', 'gaai'), 'aa-a');
  assert.equal(findTrap('saam', 'sam'), 'aa-a');
  assert.equal(findTrap('su', 'syu'), 'yu');
  assert.equal(findTrap('guok', 'gwok'), 'gw-kw');
  assert.equal(findTrap('guo', 'gwok'), 'gw-kw');
  assert.equal(findTrap('sa', 'sap'), 'ptk');
  assert.equal(findTrap('sat', 'sap'), 'ptk');
  assert.equal(findTrap('lei', 'nei'), 'ng-lazy');
  assert.equal(findTrap('o', 'ngo'), 'ng-lazy');
  assert.equal(findTrap('go', 'gou'), 'ou-ei');
  assert.equal(findTrap('dong', 'dung'), 'pinyin-finals');
  assert.equal(findTrap('jao', 'jau'), 'pinyin-finals');
  assert.equal(findTrap('yao', 'jau'), 'j-is-y');
  assert.equal(findTrap('sao', 'siu'), null);
  assert.equal(findTrap('siao', 'siu'), 'pinyin-finals');
  assert.equal(findTrap('hou', 'hou'), null);
  assert.equal(findTrap('abc', 'hou'), null);
});

test('normalize 去掉声调数字和大写', () => {
  assert.equal(normalize('Hoeng1 '), 'hoeng');
});

test('按音节判题：对了前进，连错两次揭晓答案，错题排到最后再来一遍', () => {
  const s = createSession([toItem(['香港', 'hoeng gong']), toItem(['一', 'jat'])], { now: 0 });
  assert.deepEqual(submit(s, 'hoeng ', 0).type, 'correct');
  const r = submit(s, 'gong', 0);
  assert.equal(r.itemDone, true);
  assert.equal(r.combo, 2);

  const w = submit(s, 'yat', 0);
  assert.equal(w.type, 'wrong');
  assert.equal(w.trap, 'j-is-y');
  const rv = submit(s, 'jet', 0);
  assert.equal(rv.type, 'reveal');
  assert.equal(rv.answer, 'jat');
  const ok = submit(s, 'jat', 0);
  assert.equal(ok.clean, false);
  assert.equal(ok.sessionDone, false);
  assert.equal(current(s).zh, '一');
  assert.equal(current(s).retry, true);
  const last = submit(s, 'jat', 60000);
  assert.equal(last.sessionDone, true);
  assert.ok(isDone(s));

  const sum = summary(s);
  assert.equal(sum.firstTry, 1);
  assert.equal(sum.accuracy, 0.5);
  assert.deepEqual(sum.missedKeys, ['一']);
});

test('IME 实战关按整句汉字判，忽略标点', () => {
  const s = createSession([toItem(['我唔知', 'ngo m zi'])], { mode: 'ime' });
  assert.equal(submit(s, '我唔知。').type, 'correct');
  assert.ok(isDone(s));
});

test('评分：打完 1 星，掌握 80% 2 星，全部掌握 3 星', () => {
  assert.equal(starsForMastery(0.5), 1);
  assert.equal(starsForMastery(0.8), 2);
  assert.equal(starsForMastery(0.99), 2);
  assert.equal(starsForMastery(1), 3);
});

const sumOf = (cleared, missed, extra = {}) => ({
  total: cleared.length + missed.length, firstTry: cleared.length, accuracy: 0, maxCombo: 1, spm: 20,
  missedKeys: missed, clearedKeys: cleared, ...extra,
});

test('再练只出没掌握的字，把错字补对就拿满星', () => {
  const lvA = { id: 'a', items: [['一', 'jat'], ['十', 'sap'], ['六', 'luk'], ['八', 'baat'], ['七', 'cat']] };
  const units = [{ id: 'u1', levels: [lvA, { id: 'b', items: [] }] }];
  let st = emptyState();
  assert.equal(isUnlocked(st, units, 'b'), false);
  const items = lvA.items.map((it) => toItem(it));

  // 第一次：错了 2 个 → 掌握 3/5 = 60% → 1 星，但下一关解锁
  let res = applyResult(st, { level: lvA, summary: sumOf(['十', '六', '八'], ['一', '七']), items }, '2026-09-27');
  st = res.state;
  assert.equal(res.gained.stars, 1);
  assert.equal(res.gained.mastered, 3);
  assert.equal(isUnlocked(st, units, 'b'), true);
  assert.deepEqual(itemsToPractice(st, lvA).map(([zh]) => zh), ['一', '七']);

  // 第二次：只练那 2 个，又错 1 个 → 4/5 = 80% → 2 星
  res = applyResult(st, { level: lvA, summary: sumOf(['一'], ['七']), items: [toItem(['一', 'jat']), toItem(['七', 'cat'])] }, '2026-09-27');
  st = res.state;
  assert.equal(res.gained.stars, 2);
  assert.equal(res.gained.newStars, 1);
  assert.deepEqual(itemsToPractice(st, lvA).map(([zh]) => zh), ['七']);
  assert.equal(st.review['一'], undefined);

  // 第三次：补对 → 全部掌握 → 3 星；之后点这关是自由练习整关
  res = applyResult(st, { level: lvA, summary: sumOf(['七'], []), items: [toItem(['七', 'cat'])] }, '2026-09-28');
  st = res.state;
  assert.equal(res.gained.stars, 3);
  assert.equal(itemsToPractice(st, lvA).length, 5);
  assert.deepEqual(st.review, {});
  assert.equal(streak(st, '2026-09-28'), 2);
  assert.equal(streak(st, addDays('2026-09-28', 2)), 0);
});

test('错题本：明天到期，复习时一次打对就移除', () => {
  let st = emptyState();
  const items = [toItem(['一', 'jat'])];
  st = applyResult(st, { level: null, summary: sumOf([], ['一']), items }, '2026-09-27').state;
  assert.equal(dueReviews(st, '2026-09-27').length, 0);
  const due = dueReviews(st, '2026-09-28');
  assert.equal(due[0].zh, '一');
  st = applyResult(st, { level: null, summary: sumOf(['一'], []), items: due }, '2026-09-28').state;
  assert.deepEqual(st.review, {});
  assert.equal(st.mastered['一'], true);
});

test('旧存档迁移：打完过的关里，不在错题本的字算已掌握', () => {
  const units = [{ id: 'u1', levels: [{ id: 'a', items: [['一', 'jat'], ['十', 'sap']] }, { id: 'b', items: [['六', 'luk']] }] }];
  const old = { version: 1, stars: { a: 1 }, review: { 一: { box: 0, due: '2026-09-28', jp: 'jat' } }, xpByDay: {}, settings: { sound: false } };
  const st = migrate(old, units);
  assert.deepEqual(st.mastered, { 十: true });
  assert.deepEqual(st.review['一'], { due: '2026-09-28', jp: 'jat' });
  assert.equal(st.settings.sound, false);
  assert.equal(st.settings.rubricClosed, false);
});