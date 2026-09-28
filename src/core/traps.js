// 普通话拼音使用者打粤拼时的常见陷阱。
// detect(typed, answer) 只看单个音节（都已去掉声调、转小写），命中返回 true。

const codaOf = (s) => (s.match(/(ng|[mnptk])$/) ?? [''])[0];

export const TRAPS = {
  zcs: {
    title: '粤拼没有 zh / ch / sh / x / q',
    body: '拼音的 zh/j → z，ch/q → c，sh/x → s。',
    examples: [['知', 'zi'], ['茶', 'caa'], ['食', 'sik'], ['心', 'sam']],
    detect: (t, a) => /^(zh|ch|sh|x|q)/.test(t) && /^[zcs]/.test(a),
  },
  'j-is-y': {
    title: '粤拼的 y 写成 j',
    body: '拼音里的 y 开头，粤拼一律写 j。',
    examples: [['人', 'jan'], ['一', 'jat'], ['有', 'jau'], ['魚', 'jyu']],
    detect: (t, a) => a.startsWith('j') && (t.startsWith('y') || (t[0] !== 'j' && t === a.slice(1))),
  },
  yu: {
    title: 'ü 的音写成 yu',
    body: '拼音的 ü / u（在 x、j、q、y 后）粤拼写 yu。「魚」是 j + yu = jyu。',
    examples: [['書', 'syu'], ['月', 'jyut'], ['魚', 'jyu'], ['豬', 'zyu']],
    detect: (t, a) => a.includes('yu') && !t.includes('yu') && /(v|ü|u)/.test(t),
  },
  'oe-eo': {
    title: '粤拼没有 io / ue，用 oe / eo',
    body: '长音写 oe（香 hoeng、靴 hoe），短音写 eo（出 ceot、春 ceon），「水」这类写 eoi。',
    examples: [['香', 'hoeng'], ['靴', 'hoe'], ['出', 'ceot'], ['水', 'seoi']],
    detect: (t, a) => /oe|eo/.test(a) && !/oe|eo/.test(t) && codaOf(t) === codaOf(a),
    detectSwap: (t, a) => (a.includes('oe') && t.replace('eo', 'oe') === a) || (a.includes('eo') && t.replace('oe', 'eo') === a),
  },
  'aa-a': {
    title: '长 aa 和短 a 是两个音',
    body: '嘴张大、拖得长的写 aa（街 gaai、三 saam），短促的写 a（雞 gai、心 sam）。单独一个「a」结尾一定是 aa。',
    examples: [['街', 'gaai'], ['雞', 'gai'], ['三', 'saam'], ['心', 'sam']],
    detect: (t, a) => t !== a && (t.replace('aa', 'a') === a || a.replace('aa', 'a') === t),
  },
  'gw-kw': {
    title: 'gu / ku 写成 gw / kw',
    body: '拼音 guo、guang、kun 这种，粤拼把 u 并进声母：gw、kw。',
    examples: [['國', 'gwok'], ['廣', 'gwong'], ['裙', 'kwan'], ['光', 'gwong']],
    detect: (t, a) => /^(gw|kw)/.test(a) && t[0] === a[0] && t[1] !== 'w',
  },
  ptk: {
    title: '入声字要打 p / t / k 结尾',
    body: '一听就「卡住」的字，结尾是 p（嘴唇关）、t（舌尖关）或 k（舌根关）。',
    examples: [['十', 'sap'], ['八', 'baat'], ['六', 'luk'], ['一', 'jat']],
    detect: (t, a) => /[ptk]$/.test(a) && t !== a && (t === a.slice(0, -1) || (/[ptk]$/.test(t) && t.slice(0, -1) === a.slice(0, -1))),
  },
  'ng-lazy': {
    title: '别被懒音带偏',
    body: '标准读音：你 nei（不是 lei）、我 ngo（不是 o）、國 gwok（不是 gok）。唔 = m，五 / 吳 = ng。',
    examples: [['你', 'nei'], ['我', 'ngo'], ['牛', 'ngau'], ['五', 'ng']],
    detect: (t, a) =>
      (a.startsWith('ng') && a.length > 2 && t === a.slice(2)) ||
      (a.startsWith('n') && !a.startsWith('ng') && t === 'l' + a.slice(1)) ||
      (a.endsWith('ng') && t === a.slice(0, -1)) ||
      (a.endsWith('k') && t === a.slice(0, -1) + 't') ||
      ((a === 'm' || a === 'ng') && t !== a && /^(n|en|wu|u|mu|ng|m)$/.test(t)),
  },
  'pinyin-finals': {
    title: '拼音的 ong / ao / iao 要换写法',
    body: '拼音 ong → 粤拼 ung（東 dung、中 zung），ao → au（有 jau、交 gaau），iao → iu（小 siu）。',
    examples: [['東', 'dung'], ['中', 'zung'], ['有', 'jau'], ['小', 'siu']],
    detect: (t, a) => t !== a && [['ong', 'ung'], ['ao', 'au'], ['iao', 'iu'], ['ao', 'aau']].some(([p, j]) => a.includes(j) && t.replace(p, j) === a),
  },
  'ou-ei': {
    title: '粤拼的 ou、ei 别省略',
    body: '「高」是 gou，「四」是 sei，「好」是 hou，要把整个韵母打全。',
    examples: [['高', 'gou'], ['好', 'hou'], ['四', 'sei'], ['飛', 'fei']],
    detect: (t, a) => /(ou|ei)$/.test(a) && t === a.slice(0, -1),
  },
};

// 按优先级找出本次打错对应的陷阱，找不到返回 null。
const ORDER = ['zcs', 'j-is-y', 'yu', 'oe-eo', 'gw-kw', 'ptk', 'ng-lazy', 'pinyin-finals', 'aa-a', 'ou-ei'];

export function findTrap(typed, answer) {
  if (!typed || typed === answer) return null;
  for (const id of ORDER) {
    const trap = TRAPS[id];
    if (trap.detect(typed, answer) || trap.detectSwap?.(typed, answer)) return id;
  }
  return null;
}
