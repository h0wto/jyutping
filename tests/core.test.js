import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTrap } from '../src/core/traps.js';
import { createSession, submit, summary, toItem, normalize, isDone, current } from '../src/core/session.js';
import { emptyState, applyResult, streak, starsFor, isUnlocked, dueReviews, addDays } from '../src/core/progress.js';

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

test('星级、解锁、打卡和错题复习', () => {
  assert.equal(starsFor(1), 3);
  assert.equal(starsFor(0.92), 2);
  assert.equal(starsFor(0.8), 1);
  assert.equal(starsFor(0.5), 1);

  const units = [{ id: 'u1', levels: [{ id: 'a', items: [] }, { id: 'b', items: [] }] }];
  let st = emptyState();
  assert.equal(isUnlocked(st, units, 'a'), true);
  assert.equal(isUnlocked(st, units, 'b'), false);

  const items = [toItem(['一', 'jat']), toItem(['十', 'sap'])];
  const sum = { total: 2, firstTry: 1, accuracy: 0.5, maxCombo: 1, spm: 20, missedKeys: ['一'], clearedKeys: ['十'] };
  let res = applyResult(st, { levelId: 'a', summary: sum, items }, '2026-09-27');
  st = res.state;
  assert.equal(res.gained.stars, 1);
  assert.equal(isUnlocked(st, units, 'b'), true);
  assert.equal(st.review['一'].due, '2026-09-28');
  assert.equal(dueReviews(st, '2026-09-28')[0].zh, '一');

  const good = { ...sum, firstTry: 2, accuracy: 1, missedKeys: [], clearedKeys: ['十'] };
  res = applyResult(st, { levelId: 'a', summary: good, items }, '2026-09-28');
  st = res.state;
  assert.equal(res.gained.newStars, 2);
  assert.equal(isUnlocked(st, units, 'b'), true);
  assert.equal(streak(st, '2026-09-28'), 2);
  assert.equal(streak(st, addDays('2026-09-28', 1)), 2);
  assert.equal(streak(st, addDays('2026-09-28', 2)), 0);

  const review = dueReviews(st, '2026-09-28');
  res = applyResult(st, { levelId: null, summary: { ...good, clearedKeys: ['一'] }, items: review }, '2026-09-28');
  assert.equal(res.state.review['一'].box, 1);
  assert.equal(res.state.review['一'].due, '2026-09-30');
});
