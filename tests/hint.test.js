import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, diagnose, buildExamples } from '../src/core/hint.js';
import { UNITS } from '../src/data/units.js';

const EX = buildExamples(UNITS);

test('拆音节：声母 + 元音 + 韵尾', () => {
  assert.deepEqual(parse('saang'), { initial: 's', final: 'aang', vowel: 'aa', coda: 'ng' });
  assert.deepEqual(parse('seoi'), { initial: 's', final: 'eoi', vowel: 'eo', coda: 'i' });
  assert.deepEqual(parse('jyut'), { initial: 'j', final: 'yut', vowel: 'yu', coda: 't' });
  assert.deepEqual(parse('gwok'), { initial: 'gw', final: 'ok', vowel: 'o', coda: 'k' });
  assert.deepEqual(parse('ngo'), { initial: 'ng', final: 'o', vowel: 'o', coda: '' });
  assert.deepEqual(parse('m'), { initial: '', final: 'm', vowel: 'm', coda: '' });
  assert.deepEqual(parse('hou'), { initial: 'h', final: 'ou', vowel: 'o', coda: 'u' });
});

test('元音打错：指出张口大小 / 圆唇 / 长短，并用认识的字对照', () => {
  const d = diagnose('sei', 'sai', EX);
  assert.match(d.line, /开头 s 啱咗/);
  assert.match(d.line, /嘴要再张大/);
  assert.match(d.line, /-ei 系「/);
  assert.equal(d.pair, 'ei>ai');

  assert.match(diagnose('sen', 'san', EX).line, /粤拼冇 -en/);
  assert.match(diagnose('sen', 'san', EX).line, /张大/);
  assert.match(diagnose('sam', 'saam', EX).line, /拖长/);
  assert.match(diagnose('san', 'sin', EX).line, /收细/);
  assert.match(diagnose('sik', 'suk', EX).line, /圆唇/);
});

test('只错韵尾 / 只错声母', () => {
  assert.match(diagnose('sin', 'sing', EX).line, /结尾唔啱.*舌根收 ng/);
  assert.match(diagnose('bat', 'bak', EX).line, /舌根卡住 k/);
  assert.match(diagnose('dan', 'tan', EX).line, /韵母 -an 啱咗，系开头声母唔啱/);
});

test('揭晓答案时给出正确韵母和你打的韵母的例字，不拿正在考的字做例子', () => {
  assert.doesNotMatch(diagnose('fen', 'fan', EX, '分').reveal, /分/);
  const d = diagnose('sei', 'sai', EX);
  assert.match(d.reveal, /^-ai 同「/);
  assert.match(d.reveal, /你打嘅 -ei 系「/);
});
