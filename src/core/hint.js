// 根据「打了什么」和「应该打什么」逐部分对比，给出量身定制的提示。
// 音节拆成：声母 + 元音 + 韵尾，例如 saang = s + aa + ng，seoi = s + eo + i。

const INITIALS = ['ng', 'gw', 'kw', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'w', 'z', 'c', 's', 'j'];

// 粤拼全部韵母（不含极少用的 en / et 等）。
export const FINALS = new Set(`aa aai aau aam aan aang aap aat aak a ai au am an ang ap at ak
  e ei eu em eng ep ek i iu im in ing ip it ik o oi ou on ong ot ok oe oeng oet oek
  eo eoi eon eot u ui un ung ut uk yu yun yut m ng`.split(/\s+/));

// open：张口大小；round：圆唇；front：舌头靠前（null = 居中）
const VOWEL = {
  i: { open: 1, round: false, front: true },
  yu: { open: 1, round: true, front: true },
  u: { open: 1, round: true, front: false },
  e: { open: 2, round: false, front: true },
  oe: { open: 2, round: true, front: true },
  eo: { open: 2, round: true, front: true },
  o: { open: 2, round: true, front: false },
  a: { open: 3, round: false, front: null },
  aa: { open: 4, round: false, front: null },
};

const CODA_DESC = {
  '': '直接收（冇韵尾）',
  i: '收 i（滑向 i）',
  u: '收 u（滑向 u）',
  m: '闭嘴收 m',
  n: '舌尖收 n',
  ng: '舌根收 ng',
  p: '闭嘴卡住 p',
  t: '舌尖卡住 t',
  k: '舌根卡住 k',
};

export function parse(syl) {
  if (syl === 'm' || syl === 'ng') return { initial: '', final: syl, vowel: syl, coda: '' };
  const initial = INITIALS.find((i) => syl.startsWith(i) && syl.length > i.length && /[aeiouy]/.test(syl[i.length])) ?? '';
  const final = syl.slice(initial.length);
  let coda = (final.match(/(ng|[mnptk])$/) ?? [''])[0];
  let vowel = final.slice(0, final.length - coda.length);
  // 复韵母：ai、au、ei、eoi、iu、oi、ou、ui……最后的 i / u 当韵尾
  if (!coda && vowel.length > 1 && /[iu]$/.test(vowel) && vowel !== 'yu' && VOWEL[vowel.slice(0, -1)]) {
    coda = vowel.slice(-1);
    vowel = vowel.slice(0, -1);
  }
  return { initial, final, vowel, coda };
}

// 每个韵母找一个关卡里的字做例子，用来「你打的音 = 哪个字」对照。
export function buildExamples(units) {
  const byFinal = {};
  for (const u of units) {
    if (u.mode === 'ime') continue;
    for (const l of u.levels) {
      for (const [zh, jp] of l.items) {
        [...zh].forEach((ch, i) => {
          const syl = jp.split(' ')[i];
          const f = parse(syl).final;
          (byFinal[f] ??= []);
          if (byFinal[f].length < 4 && !byFinal[f].some(([c]) => c === ch)) byFinal[f].push([ch, syl]);
        });
      }
    }
  }
  return byFinal;
}

const ex = (examples, final, n = 2, skip = '') => (examples[final] ?? []).filter(([c]) => c !== skip).slice(0, n).map(([c, s]) => `「${c} ${s}」`).join('、');

function vowelAdvice(t, a) {
  const tv = VOWEL[t], av = VOWEL[a];
  if (!tv || !av) return '换个元音';
  if ((t === 'a' && a === 'aa') || (t === 'aa' && a === 'a')) return a === 'aa' ? '要拖长啲（长 aa）' : '要短促啲（短 a）';
  if (tv.open !== av.open) return av.open > tv.open ? '嘴要再张大啲' : '嘴要收细啲';
  if (tv.round !== av.round) return av.round ? '要圆唇' : '唔使圆唇';
  if (tv.front !== av.front) return av.front ? '舌头要再向前（oe / eo / yu 嗰类）' : '舌头要再向后（o / u 嗰类）';
  return '换个元音';
}

// 返回 { line, reveal, pair }：line 是第一次打错时的提示（不直接给答案），
// reveal 是第二次打错揭晓答案时的对照说明，pair 用来统计个人易错组合。
export function diagnose(typed, answer, examples = {}, skip = '') {
  const T = parse(typed), A = parse(answer);
  const out = { line: '', reveal: '', pair: null };
  const typedValid = FINALS.has(T.final);
  const sounds = typedValid && ex(examples, T.final, 1) ? `你打嘅 -${T.final} 系${ex(examples, T.final, 1)}嗰个音。` : '';

  if (T.final === A.final) {
    out.line = `韵母 -${A.final} 啱咗，系开头声母唔啱。`;
  } else if (T.initial !== A.initial) {
    out.line = '声母同韵母都唔啱，听吓个字再打。';
  } else {
    out.pair = `${T.final}>${A.final}`;
    const head = A.initial ? `开头 ${A.initial} 啱咗，` : '';
    if (!typedValid) {
      out.line = `${head}但粤拼冇 -${T.final} 呢个韵母。`;
      if (T.vowel !== A.vowel && VOWEL[T.vowel] && VOWEL[A.vowel]) out.line += `提示：元音${vowelAdvice(T.vowel, A.vowel)}。`;
    } else if (T.vowel === A.vowel) {
      out.line = `${head}元音 ${A.vowel} 都啱，系结尾唔啱：应该${CODA_DESC[A.coda] ?? '换个收尾'}，你打嘅系${CODA_DESC[T.coda] ?? T.coda}。`;
    } else if (T.coda === A.coda) {
      out.line = `${head}结尾都啱，系元音唔啱：${vowelAdvice(T.vowel, A.vowel)}。${sounds}`;
    } else {
      out.line = `${head}韵母唔啱：元音${vowelAdvice(T.vowel, A.vowel)}，结尾亦要${CODA_DESC[A.coda] ?? '换'}。${sounds}`;
    }
  }

  const right = ex(examples, A.final, 2, skip);
  const wrong = typedValid && T.final !== A.final ? ex(examples, T.final) : '';
  out.reveal = `-${A.final} 同${right || ` ${answer}`}一样${wrong ? `；你打嘅 -${T.final} 系${wrong}` : ''}。`;
  return out;
}
