#!/usr/bin/env node
// 对照 rime-cantonese 字表/词表核对 src/data/units.js 里的粤拼。
// 用法：node scripts/verify-data.mjs [chars.dict.yaml] [words.dict.yaml] [phrase.dict.yaml]
// 零依赖，Node >= 18（ESM）。任何 error 都会让进程以非 0 退出。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const cache = resolve(root, '.cache');

const charsPath = process.argv[2] || resolve(cache, 'jyut6ping3.chars.dict.yaml');
const wordsPath = process.argv[3] || resolve(cache, 'jyut6ping3.words.dict.yaml');
const phrasePath = process.argv[4] || resolve(cache, 'jyut6ping3.phrase.dict.yaml');

// ---------- 合法粤拼音节 ----------
const INITIALS = '(?:ng|gw|kw|b|p|m|f|d|t|n|l|g|k|h|w|z|c|s|j)';
const FINALS =
  '(?:aai|aau|aam|aan|aang|aap|aat|aak|aa|ai|au|am|an|ang|ap|at|ak|a' +
  '|ei|eu|em|en|eng|ep|et|ek|e' +
  '|iu|im|in|ing|ip|it|ik|i' +
  '|oi|ou|on|ong|ot|ok|o' +
  '|ui|un|ung|ut|uk|u' +
  '|oeng|oek|oe|eoi|eon|eot' +
  '|yun|yut|yu)';
const SYLLABLE = new RegExp(`^(?:${INITIALS}?${FINALS}|m|ng)$`);

// ---------- 读字典 ----------
function readDict(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === '...');
  const map = new Map(); // word -> Map(tonelessReading -> maxWeightString)
  for (const line of lines.slice(start + 1)) {
    if (!line || line.startsWith('#')) continue;
    const [word, reading, weight] = line.split('\t');
    if (!word) continue;
    if (!map.has(word)) map.set(word, new Map());
    if (reading === undefined || reading === '') continue; // phrase 表只有词、无读音
    const toneless = reading.trim().replace(/[1-6]/g, '').replace(/\s+/g, ' ');
    const m = map.get(word);
    if (!m.has(toneless)) m.set(toneless, []);
    m.get(toneless).push(weight ?? '');
  }
  return map;
}

const need = [charsPath, wordsPath];
for (const p of need) {
  if (!existsSync(p)) {
    console.error(`找不到字典文件：${p}\n请先把 rime-cantonese 的 jyut6ping3.*.dict.yaml 下载到 .cache/`);
    process.exit(2);
  }
}
const chars = readDict(charsPath);
const words = readDict(wordsPath);
const phrase = existsSync(phrasePath) ? readDict(phrasePath) : null;

const { UNITS } = await import(pathToFileURL(resolve(root, 'src/data/units.js')).href);

// ---------- 核对 ----------
const errors = [];
const warnings = [];
const seen = new Map(); // "中文|jyutping" -> first location
const counts = [];
let total = 0;
let wordsChecked = 0;
let wordsUnverified = 0;

const splitChars = (s) => Array.from(s);

for (const unit of UNITS) {
  let unitCount = 0;
  for (const level of unit.levels) {
    for (const item of level.items) {
      total++;
      unitCount++;
      const where = `${level.id}`;
      const [zh, jp] = item;
      const tag = `${where} [${zh} / ${jp}]`;
      if (typeof zh !== 'string' || typeof jp !== 'string') {
        errors.push(`${tag}: 条目格式不对`);
        continue;
      }
      const cs = splitChars(zh);
      const syls = jp.split(' ');
      if (jp !== jp.trim() || /\s{2,}/.test(jp) || /[A-Z0-9]/.test(jp)) {
        errors.push(`${tag}: 粤拼须小写、无声调数字、单空格分隔`);
      }
      if (cs.length !== syls.length) {
        errors.push(`${tag}: 音节数 ${syls.length} ≠ 字数 ${cs.length}`);
        continue;
      }
      syls.forEach((s, i) => {
        if (!SYLLABLE.test(s)) errors.push(`${tag}: 「${s}」不是合法粤拼音节`);
        const readings = chars.get(cs[i]);
        if (!readings) {
          errors.push(`${tag}: 字表里没有「${cs[i]}」`);
        } else if (!readings.has(s)) {
          errors.push(`${tag}: 「${cs[i]}」读 ${s} 不在字表中（字表：${[...readings.keys()].join('/')}）`);
        } else {
          const ws = readings.get(s);
          if (ws.length && ws.every((w) => w === '0%')) {
            warnings.push(`${tag}: 「${cs[i]}」读 ${s} 在字表中权重为 0%（罕用读音？）`);
          }
        }
      });
      if (cs.length > 1) {
        const w = words.get(zh);
        if (w && w.size) {
          wordsChecked++;
          if (!w.has(jp)) {
            errors.push(`${tag}: 词表读音为 ${[...w.keys()].join(' / ')}`);
          }
        } else {
          wordsUnverified++;
          const inPhrase = phrase && phrase.has(zh);
          warnings.push(`${tag}: unverified word (chars ok)${inPhrase ? ' — 见于 phrase 表但该表无读音' : ''}`);
        }
      }
      const key = `${zh}|${jp}`;
      if (seen.has(key)) warnings.push(`${tag}: 重复条目（首次出现在 ${seen.get(key)}）`);
      else seen.set(key, where);
    }
  }
  counts.push([unit.id, unit.title, unit.levels.length, unitCount]);
}

// ---------- 输出 ----------
console.log('各单元条目数：');
for (const [id, title, lv, n] of counts) console.log(`  ${id.padEnd(4)} ${title}\t${lv} 关\t${n} 条`);
console.log(`合计 ${total} 条；多字词中 ${wordsChecked} 条经词表核对，${wordsUnverified} 条词表未收（仅逐字核对）。`);
if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  for (const w of warnings) console.log('  ⚠ ' + w);
}
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条：`);
  for (const e of errors) console.log('  ✗ ' + e);
}
console.log(`\n结果：${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
