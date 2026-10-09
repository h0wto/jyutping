import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../src/data/units.js';
import { TRAPS } from '../src/core/traps.js';
import { createSession, submit, toItem, isDone } from '../src/core/session.js';

test('每个单元的陷阱 id 都有对应规则卡', () => {
  for (const u of UNITS) if (u.trap) assert.ok(TRAPS[u.trap], `${u.id} 的 ${u.trap} 没有规则卡`);
});

test('关卡 id 唯一，每题音节数等于字数', () => {
  const ids = new Set();
  for (const u of UNITS) {
    for (const l of u.levels) {
      assert.ok(!ids.has(l.id), `重复关卡 ${l.id}`);
      ids.add(l.id);
      for (const [zh, jp] of l.items) assert.equal([...zh].length, jp.split(' ').length, `${zh} ${jp}`);
    }
  }
});

test('每一关都能用标准答案一次打通', () => {
  for (const u of UNITS) {
    for (const l of u.levels) {
      const s = createSession(l.items.map((it) => toItem(it)), { mode: u.mode });
      for (const it of s.queue.slice()) {
        if (u.mode === 'ime') submit(s, it.zh);
        else for (const syl of it.syls) submit(s, syl);
      }
      assert.ok(isDone(s), l.id);
    }
  }
});

test('不重复练同一个音：每题都带来新音节，每个音节最多出现在 4 道题里', () => {
  const seen = new Set();
  const uses = new Map();
  for (const u of UNITS) {
    if (u.mode === 'ime') continue; // 实战关本来就是拿学过的音拼整句
    for (const l of u.levels) {
      for (const [zh, jp] of l.items) {
        const syls = [...new Set(jp.split(' '))];
        assert.ok(syls.some((s) => !seen.has(s)), `${l.id} ${zh} 的音节之前都打过了`);
        for (const s of syls) {
          seen.add(s);
          uses.set(s, (uses.get(s) ?? 0) + 1);
          assert.ok(uses.get(s) <= 4, `${s} 出现太多次了`);
        }
      }
    }
  }
});
