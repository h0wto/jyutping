import { UNITS } from './data/units.js';
import { TRAPS } from './core/traps.js';
import { createSession, submit, summary, current, progress, toItem } from './core/session.js';
import {
  emptyState, applyResult, streak, dayKey, addDays, isUnlocked, nextLevel, dueReviews, flatLevels, DAILY_GOAL_XP,
} from './core/progress.js';
import { sfx, unlockAudio, setSound, speak, confetti, vibrate } from './ui/fx.js';

const STORE_KEY = 'jyutping-daily:v1';
const app = document.getElementById('app');
const LEVELS = flatLevels(UNITS);

// ---------- 存档 ----------
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch {}
  return emptyState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}
let state = load();
setSound(state.settings.sound);
navigator.storage?.persist?.();

// ---------- 小工具 ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const starText = (n, max = 3) => `${'<b>★</b>'.repeat(n)}${'★'.repeat(max - n)}`;
const levelNo = (lv) => lv.unit.levels.findIndex((l) => l.id === lv.id) + 1;
const totalStars = () => Object.values(state.stars).reduce((a, b) => a + b, 0);

const PRAISE = ['好嘢！', '正！', '叻！', '啱晒！', '得咗！', '犀利！'];
const COMBO_WORDS = { 5: '手感嚟咗 🔥', 10: '勁過火 🔥🔥', 20: '無得頂 🚀', 30: '打字機上身 ⌨️' };
const RESULT_TITLES = [
  ['差少少，再嚟過！', '错的字已经记进复习本'],
  ['過關！', '下一站已经开通'],
  ['好叻！', '准确率 90% 以上'],
  ['冇得彈！', '几乎全对，完美一站'],
];

function trapCard(id, kicker, cls = '') {
  const t = TRAPS[id];
  if (!t) return '';
  return `<div class="card ${cls}">
    ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
    <h4>${esc(t.title)}</h4>
    <p>${esc(t.body)}</p>
    <div class="ex">${t.examples.map(([zh, jp]) => `<span>${esc(zh)}<code>${esc(jp)}</code></span>`).join('')}</div>
  </div>`;
}

function ring(xp) {
  const r = 32, c = 2 * Math.PI * r;
  const pct = Math.min(1, xp / DAILY_GOAL_XP);
  return `<div class="ring ${pct >= 1 ? 'full' : ''}">
    <svg width="76" height="76" viewBox="0 0 76 76"><circle class="track" cx="38" cy="38" r="${r}" fill="none" stroke-width="8"/>
    <circle class="fill" cx="38" cy="38" r="${r}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>
    <span>${pct >= 1 ? '✓' : xp}<small>${pct >= 1 ? '达成' : `/ ${DAILY_GOAL_XP} XP`}</small></span>
  </div>`;
}

// ---------- 首页 ----------
function renderHome() {
  const today = dayKey();
  const xpToday = state.xpByDay[today] ?? 0;
  const st = streak(state, today);
  const next = nextLevel(state, UNITS);
  const due = dueReviews(state, today, 99).length;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const wd = ['日', '一', '二', '三', '四', '五', '六'];

  const unitsHtml = UNITS.map((u, ui) => {
    const unlocked = isUnlocked(state, UNITS, u.levels[0].id);
    const got = u.levels.reduce((a, l) => a + (state.stars[l.id] ?? 0), 0);
    const stops = u.levels.map((l, li) => {
      const s = state.stars[l.id] ?? 0;
      const open = isUnlocked(state, UNITS, l.id);
      const cls = l.id === next.id && !(s > 0) ? 'current' : s > 0 ? 'cleared' : open ? '' : 'locked';
      return `<div class="stop ${cls}">
        ${cls === 'current' ? '<div class="bubble">下一站</div>' : ''}
        <button class="stop-btn" data-level="${l.id}" ${open ? '' : 'disabled'} aria-label="第 ${li + 1} 关">${open ? li + 1 : '🔒'}</button>
        <div class="stars">${open ? starText(s) : ''}</div>
      </div>`;
    }).join('');
    return `<section class="unit ${unlocked ? '' : 'locked'}">
      <button class="unit-head" data-unit="${u.id}">
        <span class="no">${String(ui + 1).padStart(2, '0')}</span>
        <div><h3>${esc(u.icon)} ${esc(u.title)}</h3><p>${esc(u.subtitle)}</p></div>
        <span class="count">★ ${got}/${u.levels.length * 3}</span>
      </button>
      <div class="route">${stops}</div>
    </section>`;
  }).join('');

  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><b>粵</b>拼日日打</div>
      <span class="chip fire ${st ? 'on' : ''}" title="连续天数">🔥 ${st}</span>
      <span class="chip" title="星星">⭐ ${totalStars()}</span>
    </div>
    <div class="today">
      ${ring(xpToday)}
      <div>
        <h2>${xpToday >= DAILY_GOAL_XP ? '今日目标完成 🎉' : st ? `连续 ${st} 日，保持住！` : '今日打一局就开始连胜'}</h2>
        <p>${xpToday >= DAILY_GOAL_XP ? '想加练随时再来一局' : `再拿 ${DAILY_GOAL_XP - xpToday} XP 完成今日目标`}</p>
        <div class="week">${week.map((d) => `<i class="${state.xpByDay[d] ? 'done' : ''} ${d === today ? 'today-mark' : ''}">${wd[new Date(d + 'T00:00').getDay()]}</i>`).join('')}</div>
      </div>
    </div>
    <div class="cta"><button class="btn" data-go="daily">开始今日练习 <small>· ${esc(next.unit.title)} 第 ${levelNo(next)} 关</small></button></div>
    <p class="cta-sub">${due ? `另有 ${due} 个错字到期复习，会混在这局里` : '每局约 5 分钟 · 打完一个音节按空格'}</p>
    ${due > 6 ? `<button class="btn ghost" data-go="review">只练复习（${due}）</button>` : ''}
    ${unitsHtml}
    <div class="footer-links">
      <button class="btn ghost" data-go="rules">📖 规则手册</button>
      <button class="btn ghost" data-go="settings">⚙️ 设置</button>
    </div>`;

  app.querySelector('[data-go="daily"]').onclick = () => startLevel(next, true);
  app.querySelector('[data-go="review"]')?.addEventListener('click', startReview);
  app.querySelector('[data-go="rules"]').onclick = renderRules;
  app.querySelector('[data-go="settings"]').onclick = renderSettings;
  app.querySelectorAll('[data-level]').forEach((b) => (b.onclick = () => startLevel(LEVELS.find((l) => l.id === b.dataset.level), false)));
  app.querySelectorAll('[data-unit]').forEach((b) => (b.onclick = () => {
    const u = UNITS.find((x) => x.id === b.dataset.unit);
    if (u.trap) renderIntro(u, null);
  }));
  const cur = app.querySelector('.stop.current');
  if (cur) cur.scrollIntoView({ block: 'center' });
  else scrollTo(0, 0);
}

// ---------- 单元新规则 ----------
function renderIntro(unit, onStart) {
  app.innerHTML = `
    <div class="page-head"><button class="icon-btn" data-back>✕</button><h2>${esc(unit.icon)} ${esc(unit.title)}</h2></div>
    <div class="rules">${trapCard(unit.trap, onStart ? '本单元新规则' : '规则')}</div>
    <p class="fine">不用背。打错时相关规则会自动弹出来提醒你。</p>
    ${onStart ? '<button class="btn" data-start>明白，开始</button>' : ''}`;
  app.querySelector('[data-back]').onclick = renderHome;
  app.querySelector('[data-start]')?.addEventListener('click', onStart);
}

// ---------- 开局 ----------
function startLevel(level, withReviews) {
  unlockAudio();
  const items = level.items.map((it) => toItem(it));
  if (withReviews && level.unit.mode !== 'ime') {
    const reviews = dueReviews(state).filter((r) => !items.some((i) => i.key === r.key));
    reviews.forEach((r, i) => items.splice(Math.min(items.length, 2 + i * 3), 0, r));
  }
  const go = () => play({ items, mode: level.unit.mode, level });
  const first = level.unit.levels[0].id === level.id && !state.stars[level.id];
  if (level.unit.trap && first && !state.seenTraps.includes(level.unit.trap)) {
    state.seenTraps.push(level.unit.trap);
    save();
    renderIntro(level.unit, go);
  } else go();
}

function startReview() {
  unlockAudio();
  play({ items: dueReviews(state, dayKey(), 20), mode: 'type', level: null });
}

// ---------- 练习 ----------
function play({ items, mode, level }) {
  const s = createSession(items, { mode });
  const trapHits = [];
  let coachHtml = '';
  let flash = null; // { sylIndex, cls, text }
  let revealAnswer = null;
  let locked = false;

  app.innerHTML = `
    <div class="play">
      <div class="play-top">
        <button class="icon-btn" data-quit aria-label="退出">✕</button>
        <div class="bar"><i></i></div>
        <div class="combo"></div>
      </div>
      <div class="stage" id="stage"></div>
      ${mode === 'ime' ? '' : '<p class="tap-hint">用英文键盘打粤拼 · 每个音节按空格确认 · 声调数字可以不打</p>'}
    </div>`;
  const stage = app.querySelector('#stage');
  const barFill = app.querySelector('.bar i');
  const comboEl = app.querySelector('.combo');
  app.querySelector('[data-quit]').onclick = () => {
    if (s.pos === 0 || confirm('退出这一局？进度不会保存。')) renderHome();
  };

  let input;
  if (mode === 'ime') {
    stage.innerHTML = `<div class="tag"></div><div class="cols"></div>
      <div class="ime-box"><input id="ime" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="用粵拼鍵盤打出上面嘅字"><button class="btn" data-ok>確定</button></div>
      <div class="jp-hint"></div><div class="coach"></div>`;
    input = stage.querySelector('#ime');
    const send = () => { const v = input.value; if (v.trim() && !locked) handle(submit(s, v)); };
    stage.querySelector('[data-ok]').onclick = send;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } });
  } else {
    stage.innerHTML = `<div class="tag"></div><div class="cols"></div><button class="speak" data-speak>🔊 读一次</button><div class="coach"></div>
      <input class="kbd" id="kbd" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next" aria-label="粤拼输入">`;
    input = stage.querySelector('#kbd');
    input.addEventListener('input', () => {
      if (locked) { input.value = ''; return; }
      const v = input.value;
      if (/\s/.test(v)) {
        const word = v.split(/\s/)[0];
        input.value = '';
        if (word) handle(submit(s, word));
        else draw();
      } else draw();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const v = input.value; input.value = ''; if (v && !locked) handle(submit(s, v)); }
    });
    stage.querySelector('[data-speak]').onclick = (e) => { e.stopPropagation(); speak(current(s)?.zh ?? ''); focus(); };
    stage.addEventListener('click', focus);
  }
  function focus() { input.focus({ preventScroll: true }); }

  function draw() {
    const it = current(s);
    if (!it) return;
    barFill.style.width = `${progress(s) * 100}%`;
    comboEl.textContent = s.combo >= 2 ? `🔥 ${s.combo}` : '';
    comboEl.classList.toggle('hot', s.combo >= 5);
    const tag = stage.querySelector('.tag');
    tag.textContent = it.retry ? '再嚟一次' : it.review ? '复习' : mode === 'ime' ? '实战 · 用粤拼键盘' : level ? `${level.unit.title} · 第 ${levelNo(level)} 关` : '复习';
    tag.className = `tag ${it.retry || it.review ? 'review' : ''}`;

    const cols = stage.querySelector('.cols');
    const chars = [...it.zh];
    cols.className = `cols n${Math.min(chars.length, 4)}`;
    if (mode === 'ime') {
      cols.innerHTML = `<div class="col"><div class="han">${esc(it.zh)}</div></div>`;
      stage.querySelector('.jp-hint').textContent = revealAnswer ? it.syls.join(' ') : '';
    } else {
      const buf = input.value.toLowerCase();
      cols.innerHTML = chars.map((ch, i) => {
        let cls = '', text = '';
        if (i < s.syl) { cls = 'ok'; text = esc(it.syls[i]); }
        else if (i === s.syl) {
          cls = 'active';
          text = buf ? esc(buf) : revealAnswer ? `<span class="ghost">${esc(revealAnswer)}</span>` : '';
          if (flash && flash.sylIndex === i) { cls = flash.cls; text = esc(flash.text); }
        }
        const dots = state.settings.lengthHint && i >= s.syl
          ? `<span class="dots">${[...it.syls[i]].map((_, k) => `<i class="${i === s.syl && k < buf.length ? 'on' : ''}"></i>`).join('')}</span>` : '';
        return `<div class="col"><div class="han">${esc(ch)}</div><div class="slot ${cls}">${text}${dots}</div></div>`;
      }).join('');
    }
    stage.querySelector('.coach').innerHTML = coachHtml;
  }

  function praise(text, big) {
    const el = document.createElement('div');
    el.className = `praise ${big ? 'big' : ''}`;
    el.textContent = text;
    stage.querySelector('.coach').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function handle(ev) {
    if (ev.type === 'ignored') return;
    if (ev.type === 'correct') {
      revealAnswer = null;
      coachHtml = '';
      if (ev.combo && COMBO_WORDS[ev.combo]) { praise(COMBO_WORDS[ev.combo], true); sfx.milestone(); comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); }
      if (ev.itemDone) {
        sfx.word(ev.combo);
        vibrate(15);
        if (!COMBO_WORDS[ev.combo]) praise(ev.clean ? pick(PRAISE) : '記住咗！');
        if (state.settings.speak) speak(ev.item.zh);
        if (mode === 'ime') input.value = '';
        stage.querySelector('.coach').querySelectorAll(':not(.praise)').forEach((el) => el.remove());
        // 先让整个词亮绿一下再换下一题
        const cols = stage.querySelector('.cols');
        if (mode !== 'ime') cols.querySelectorAll('.slot').forEach((el, i) => { el.className = 'slot ok'; el.textContent = ev.item.syls[i]; });
        else cols.querySelector('.han').style.color = 'var(--green)';
        barFill.style.width = `${progress(s) * 100}%`;
        if (ev.sessionDone) { locked = true; return setTimeout(finish, 650); }
        busy(420);
        return;
      }
      sfx.syllable(ev.combo || 1);
      draw();
      return;
    }

    // 打错
    sfx.wrong();
    vibrate([30, 40, 30]);
    if (ev.trap) trapHits.push(ev.trap);
    if (ev.type === 'reveal') {
      revealAnswer = ev.answer;
      coachHtml = (ev.trap ? trapCard(ev.trap, '记住这条') : '') +
        `<p class="note">正确是 <b>${esc(ev.answer)}</b>，照住打一次</p>`;
    } else if (ev.trap) {
      coachHtml = trapCard(ev.trap, state.seenTraps.includes(ev.trap) ? '又踩到这个坑' : '新规则');
      if (!state.seenTraps.includes(ev.trap)) { state.seenTraps.push(ev.trap); save(); }
    } else {
      const ans = mode === 'ime' ? '' : current(s).syls[ev.sylIndex];
      coachHtml = `<p class="note">${mode === 'ime' ? '有字唔啱，再睇清楚' : ans[0] === ev.typed[0] ? '开头啱咗，后面再谂谂' : '唔啱，再试吓'}</p>`;
    }
    if (mode === 'ime') {
      input.classList.remove('bad'); void input.offsetWidth; input.classList.add('bad');
      draw();
    } else {
      flash = { sylIndex: ev.sylIndex, cls: 'bad', text: ev.typed };
      draw();
      setTimeout(() => { flash = null; draw(); }, 450);
    }
  }

  // 答对一个词后短暂停顿，期间的输入丢弃，避免串到下一题。
  function busy(ms) {
    locked = true;
    setTimeout(() => { locked = false; input.value = ''; draw(); focus(); }, ms);
  }

  function finish() {
    const sum = summary(s);
    const res = applyResult(state, { levelId: level?.id ?? null, summary: sum, items, trapHits }, dayKey());
    state = res.state;
    save();
    input.blur();
    renderResult({ sum, gained: res.gained, level, items });
  }

  draw();
  focus();
}

// ---------- 结算 ----------
function renderResult({ sum, gained, level, items }) {
  const stars = level ? gained.stars : Math.max(1, gained.stars);
  const [title, lead] = level ? RESULT_TITLES[stars] : ['复习完成！', '错字会按间隔再出现，直到记牢'];
  const missed = [...new Set(sum.missedKeys)].map((k) => items.find((i) => i.key === k)).filter(Boolean);
  const nextLv = level ? nextLevel(state, UNITS) : null;
  const badges = [];
  if (gained.goalReached) badges.push(['🎯', '今日目标完成！', true]);
  if (gained.streakStarted) badges.push(['🔥', gained.streak > 1 ? `连续 ${gained.streak} 日！` : '连胜开始！明天再嚟', true]);
  if (gained.newSpmRecord) badges.push(['⚡', `速度新纪录：每分钟 ${sum.spm} 个音节`, true]);
  if (sum.maxCombo >= 10) badges.push(['🎵', `最长连击 ${sum.maxCombo}`, false]);
  if (level && gained.stars === 0) badges.push(['💪', '正确率 80% 就过关，错字已经记住咗', false]);

  app.innerHTML = `
    <div class="result">
      ${level ? `<div class="big-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.3}s">★</span>`).join('')}</div>` : '<div class="big-stars">📚</div>'}
      <h1>${esc(title)}</h1>
      <p class="lead">${esc(lead)}</p>
      <div class="stats">
        <div class="stat"><b>${Math.round(sum.accuracy * 100)}%</b><small>一次打对</small></div>
        <div class="stat"><b>${sum.spm}</b><small>音节/分钟</small></div>
        <div class="stat xp"><b data-count="${gained.xp}">+0</b><small>XP</small></div>
      </div>
      <div class="badges">${badges.map(([em, t, gold], i) => `<div class="badge ${gold ? 'gold' : ''}" style="animation-delay:${1 + i * 0.2}s"><span class="em">${em}</span>${esc(t)}</div>`).join('')}</div>
      ${missed.length ? `<div class="missed"><h4>要留意嘅字（已加入复习）</h4><div class="ex">${missed.map((it) => `<span>${esc(it.zh)}<code>${esc(it.syls.join(' '))}</code></span>`).join('')}</div></div>` : ''}
      <div class="actions">
        ${level && stars > 0 && nextLv && nextLv.id !== level.id ? `<button class="btn" data-next>下一站：${esc(nextLv.unit.title)} 第 ${levelNo(nextLv)} 关</button>` : ''}
        ${level ? `<button class="btn ${stars > 0 ? 'ghost' : ''}" data-again>${stars > 0 ? '再练一次，冲更多星' : '再嚟一次'}</button>` : ''}
        <button class="btn ghost" data-home>返回路线图</button>
      </div>
    </div>`;

  sfx.finish(stars);
  if (stars >= 3 || gained.goalReached) setTimeout(() => confetti(stars >= 3 ? 160 : 90), 900);
  const xpEl = app.querySelector('[data-count]');
  const target = gained.xp;
  const t0 = performance.now();
  (function tick(now) {
    const k = Math.min(1, (now - t0 - 400) / 800);
    xpEl.textContent = `+${Math.max(0, Math.round(target * k))}`;
    if (k < 1) requestAnimationFrame(tick);
  })(t0);

  app.querySelector('[data-next]')?.addEventListener('click', () => startLevel(nextLv, true));
  app.querySelector('[data-again]')?.addEventListener('click', () => startLevel(level, false));
  app.querySelector('[data-home]').onclick = renderHome;
  scrollTo(0, 0);
}

// ---------- 规则手册 ----------
function renderRules() {
  const cards = Object.keys(TRAPS).map((id) => {
    const hits = state.trapHits[id] ?? 0;
    return trapCard(id, hits ? `你踩过 ${hits} 次` : state.seenTraps.includes(id) ? '已见过' : '规则', hits ? 'hit' : '');
  }).join('');
  app.innerHTML = `
    <div class="page-head"><button class="icon-btn" data-back>←</button><h2>规则手册</h2></div>
    <p class="fine">你本身识讲广东话，只需要记住拼写上和普通话拼音唔同嘅地方。</p>
    <div class="rules">${cards}</div>`;
  app.querySelector('[data-back]').onclick = renderHome;
  scrollTo(0, 0);
}

// ---------- 设置 ----------
function renderSettings() {
  const rows = [
    ['lengthHint', '显示字母数提示', '每个格子下面用小圆点提示有几个字母，适合刚开始'],
    ['sound', '音效', '打对、连击、过关的提示音'],
    ['speak', '打完自动读出来', '用 iPhone 自带的粤语语音读每个词'],
  ];
  app.innerHTML = `
    <div class="page-head"><button class="icon-btn" data-back>←</button><h2>设置</h2></div>
    ${rows.map(([k, t, d]) => `<div class="setting"><div><b>${t}</b><p>${d}</p></div><button class="switch" role="switch" aria-checked="${state.settings[k]}" data-k="${k}" aria-label="${t}"></button></div>`).join('')}
    <p class="fine">装到主屏幕：用 Safari 打开 → 分享 → 「添加到主屏幕」，之后离线也能用。<br>
    打字前先在 设置 → 通用 → 键盘 → 键盘 → 添加新键盘 里加上「粵語（香港）」的「粵拼 — 全鍵盤」，实战关要用。</p>
    <button class="btn red" data-reset style="margin-top:20px">清空所有进度</button>`;
  app.querySelector('[data-back]').onclick = renderHome;
  app.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
    state.settings[b.dataset.k] = !state.settings[b.dataset.k];
    b.setAttribute('aria-checked', state.settings[b.dataset.k]);
    setSound(state.settings.sound);
    save();
  }));
  app.querySelector('[data-reset]').onclick = () => {
    if (confirm('确定清空所有星星、打卡和复习记录？')) { state = emptyState(); save(); renderHome(); }
  };
  scrollTo(0, 0);
}

document.addEventListener('pointerdown', unlockAudio, { once: true });
renderHome();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}
