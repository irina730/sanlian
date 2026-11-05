'use strict';
/* 三练：所有数据只存在这台手机的浏览器里（localStorage），不上传任何地方 */
const KEY = 'sanlian.v1';
const PUSH = { url: '', key: 'BBTFOJ0Oy_ncZK94nfP9W_Gvg5FgIi8kPMj2wUrhdKwdEgSMgEVgVtNGgYvfXcFQpjIn1S6K7KMAbtz_s_YmA3s' }; // 后台横幅提醒的服务地址和公钥
const TEMPO = 3.5;          // 每个动作次数约 3.5 秒
const REST_MET = 2.5;       // 组间休息的代谢当量
const MAX_REST_PER_SET = 180; // 每组最多计 3 分钟休息，防止忘关 App 虚高

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 12h2M19 12h2M7 7v10M17 7v10M10 12h4M7 9H5v6h2M17 9h2v6h-2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l5-5.5 4 3L20 7"/><path d="M15.5 7H20v4.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
};

/* ---------- 状态 ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
function defaults() {
  return { v: 3, settings: { weightLb: 130, restSec: 75, sound: true, soundMode: 'loud', sysTimer: false, onboarded: false, lastBackup: null, hideInstall: false },
    plan: clone(PLAN), customEx: {}, sessions: [], active: null, body: [] };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = defaults(), o = JSON.parse(raw);
    const out = { ...d, ...o, settings: { ...d.settings, ...o.settings } };
    if ((o.v || 1) < 2) out.plan = { ...out.plan, d1: clone(PLAN.d1) }; // 第 2 版：Day 1 换成新的标准训练
    // 第 3 版：Day 1 只留背和手臂，其他手动改过的内容不动
    if (o.v === 2) out.plan = { ...out.plan, d1: out.plan.d1.filter(i => i.ex !== 'hip-abduction' && i.ex !== 'hip-adduction') };
    out.v = 3;
    return out;
  } catch (e) { return defaults(); }
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('保存失败，请先备份数据'); }
}
const ui = { tab: 'today', view: 'tabs', pick: null, open: 0, how: {}, cal: null, range: 7, exPick: 'lat-pulldown', metric: 'weightLb', planDay: 'd1', rest: null, timer: null, f: null, snap: null };

/* ---------- 工具 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const fmtDate = s => { const d = fromYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日 ${WD[d.getDay()]}`; };
const short = s => { const d = fromYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const mmss = t => { t = Math.max(0, Math.round(t)); return `${Math.floor(t / 60)}:${pad(t % 60)}`; };
const kcalText = k => `≈ ${Math.round(k / 5) * 5}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const getEx = id => EX[id] || S.customEx[id] || { name: id, type: 'weight', met: 3.5, step: 5, goal: 'arm' };
const img = id => EX[id] ? `img/${id}.webp` : null;
const thumb = id => img(id) ? `<img class="thumb" src="${img(id)}" alt="" loading="lazy">` : `<div class="thumb">自定义</div>`;
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2400);
}
const finished = () => S.sessions.filter(s => s.done).sort((a, b) => (b.date + pad(b.startedAt)).localeCompare(a.date + pad(a.startedAt)));
const activeSession = () => S.sessions.find(s => s.id === S.active) || null;
const nextDay = () => { const l = finished()[0]; return l ? { d1: 'd2', d2: 'd3', d3: 'd1' }[l.day] || 'd1' : 'd1'; };
const fmtTarget = (it, ex) => `${it.sets}组 ×${it.low === it.high ? it.low : it.low + '-' + it.high}${ex.type === 'time' ? '秒' : '个'}${ex.perSide ? '/边' : ''}`;

/* ---------- 热量估算 ---------- */
function setWorkSec(ex, st) {
  const m = ex.perSide ? 2 : 1;
  return ex.type === 'time' ? num(st.sec) * m : num(st.reps) * m * TEMPO;
}
function sessionSec(s) {
  if (s.durationMin) return s.durationMin * 60;
  return Math.max(0, ((s.endedAt || Date.now()) - s.startedAt) / 1000);
}
function calc(s, durSec = sessionSec(s)) {
  const kg = S.settings.weightLb / 2.2046;
  let work = 0, workKcal = 0, sets = 0, volume = 0;
  const perEx = s.exercises.map(e => {
    const ex = getEx(e.ex); let k = 0, n = 0;
    e.sets.filter(x => x.done).forEach(st => {
      const w = setWorkSec(ex, st);
      work += w; k += ex.met * kg * w / 3600; n++;
      if (ex.type === 'weight') volume += num(st.lb) * num(st.reps) * (ex.perSide ? 2 : 1);
    });
    workKcal += k; sets += n;
    return { ex: e.ex, kcal: k, sets: n };
  });
  const rest = Math.min(Math.max(0, durSec - work), sets * MAX_REST_PER_SET);
  const restKcal = REST_MET * kg * rest / 3600;
  perEx.forEach(p => { if (sets) p.kcal += restKcal * p.sets / sets; });
  return { kcal: workKcal + restKcal, sets, volume, work, rest, perEx };
}
function estimate(day) {
  const kg = S.settings.weightLb / 2.2046; let sec = 480, kcal = 0;
  S.plan[day].forEach(it => {
    const ex = getEx(it.ex);
    const w = setWorkSec(ex, { reps: it.high, sec: it.low });
    sec += (w + S.settings.restSec) * it.sets;
    kcal += (ex.met * w + REST_MET * S.settings.restSec) * kg / 3600 * it.sets;
  });
  return { min: Math.round(sec / 300) * 5, kcal: kcal + REST_MET * kg * 480 / 3600 };
}

/* ---------- 历史查询与进阶建议 ---------- */
function lastFor(exId, exclude) {
  for (const s of finished()) {
    if (s.id === exclude) continue;
    const e = s.exercises.find(x => x.ex === exId && x.sets.some(t => t.done));
    if (e) return { date: s.date, sets: e.sets.filter(t => t.done) };
  }
  return null;
}
function fmtSet(ex, st) {
  if (ex.type === 'time') return `${num(st.sec)} 秒`;
  if (ex.type === 'assist') return `辅助 ${num(st.lb)} lb × ${num(st.reps)}`;
  if (ex.type === 'body' && !num(st.lb)) return `${num(st.reps)} 个`;
  return `${num(st.lb)} lb × ${num(st.reps)}`;
}
function fmtSets(ex, sets) {
  const f = sets.map(t => fmtSet(ex, t)), out = [];
  f.forEach(x => { const l = out[out.length - 1]; if (l && l.t === x) l.n++; else out.push({ t: x, n: 1 }); });
  return out.map(o => o.n > 1 ? `${o.t} (${o.n}组)` : o.t).join('，') + (ex.perSide ? ' /边' : '');
}
function suggestion(it, ex, last) {
  if (!last || last.sets.length < it.sets) return null;
  if (ex.type === 'time') {
    if (last.sets.every(t => num(t.sec) >= it.high)) {
      const v = Math.max(...last.sets.map(t => num(t.sec))) + 5;
      return { text: `上次都撑满了，今天试 ${v} 秒`, f: 'sec', v };
    }
    return null;
  }
  if (!last.sets.every(t => num(t.reps) >= it.high)) return null;
  if (ex.type === 'body') return { text: '上次都做满了，可以每组多做 2 个，或拿哑铃加一点负重' };
  const lbs = last.sets.map(t => num(t.lb));
  if (ex.type === 'assist') {
    const v = Math.max(0, Math.min(...lbs) - ex.step);
    return { text: `上次都做满了，今天试把辅助减到 ${v} lb`, f: 'lb', v };
  }
  const v = Math.max(...lbs) + ex.step;
  return { text: `上次都做满了，今天试 ${v} lb`, f: 'lb', v };
}
function bestValue(ex, e, low = 1) {
  const sets = e.sets.filter(t => t.done);
  if (!sets.length) return null;
  if (ex.type === 'time') return Math.max(...sets.map(t => num(t.sec)));
  if (ex.type === 'assist') { const ok = sets.filter(t => num(t.reps) >= low); return ok.length ? Math.min(...ok.map(t => num(t.lb))) : null; }
  if (ex.type === 'body') return Math.max(...sets.map(t => num(t.reps)));
  return Math.max(...sets.map(t => num(t.lb)));
}
const seriesUnit = ex => ex.type === 'time' ? '秒' : ex.type === 'body' ? '个' : 'lb';
function findPRs(s) {
  const out = [], prev = finished().filter(x => x.id !== s.id && x.date <= s.date);
  s.exercises.forEach(e => {
    const ex = getEx(e.ex), cur = bestValue(ex, e, e.low);
    if (cur == null) return;
    const old = prev.map(p => p.exercises.find(x => x.ex === e.ex)).filter(Boolean).map(x => bestValue(ex, x, e.low)).filter(v => v != null);
    if (!old.length) return;
    const better = ex.type === 'assist' ? cur < Math.min(...old) : cur > Math.max(...old);
    if (better) out.push({ name: ex.name, from: ex.type === 'assist' ? Math.min(...old) : Math.max(...old), to: cur, unit: seriesUnit(ex), assist: ex.type === 'assist' });
  });
  return out;
}

/* ---------- 新建训练 ---------- */
function buildExercise(it, sessionId) {
  const ex = getEx(it.ex), last = lastFor(it.ex, sessionId), sets = [], hasStd = it.lb !== undefined && it.lb !== '';
  for (let j = 0; j < it.sets; j++) {
    const p = last ? (last.sets[j] || last.sets[last.sets.length - 1]) : null;
    sets.push({ lb: hasStd ? it.lb : (p && num(p.lb) ? num(p.lb) : ''), reps: ex.type === 'time' ? '' : it.high, sec: ex.type === 'time' ? ((p && num(p.sec)) || it.low) : '', done: false });
  }
  return { ex: it.ex, low: it.low, high: it.high, target: it.sets, sets };
}
function startSession(day, date, manual) {
  const id = uid();
  const s = { id, day, date: date || ymd(), startedAt: manual ? fromYmd(date).getTime() + 43200000 : Date.now(), endedAt: null, durationMin: manual ? 60 : null, manual: !!manual, done: false, feel: null, trap: null, note: '',
    exercises: S.plan[day].map(it => buildExercise(it, id)) };
  S.sessions.push(s); S.active = id; save();
  ui.view = 'workout'; ui.open = 0; ui.how = {}; ui.snap = null;
  keepAwake(); render(); scrollTo(0, 0);
}

/* ---------- 声音 / 常亮 ---------- */
let ac = null, wake = null, bell = null, bellReady = false;
function applyAudioSession() {
  try { if (navigator.audioSession) navigator.audioSession.type = S.settings.soundMode === 'mix' ? 'ambient' : 'auto'; } catch (e) {}
}
function makeBell() {
  // 生成一段三连响的提示音。用 <audio> 播放，iPhone 上比 Web Audio 更可靠
  const sr = 22050, parts = [[.18, 1], [.09, 0], [.18, 1], [.09, 0], [.28, 1]], n = Math.floor(parts.reduce((a, p) => a + p[0], 0) * sr);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  let i = 0;
  parts.forEach(([d, on]) => { const m = Math.floor(d * sr); for (let k = 0; k < m && i < n; k++, i++) { const env = Math.min(1, k / 200, (m - k) / 400); v.setInt16(44 + i * 2, on ? Math.sin(2 * Math.PI * 1046 * k / sr) * env * 30000 : 0, true); } });
  const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
  a.preload = 'auto'; a.setAttribute('playsinline', '');
  return a;
}
function unlockAudio() {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state !== 'running') ac.resume(); } catch (e) {}
  try {
    if (!bell) bell = makeBell();
    if (!bellReady) {
      applyAudioSession();
      bell.muted = true;
      const r = bell.play();
      if (r) r.then(() => { bell.pause(); bell.currentTime = 0; bell.muted = false; bellReady = true; }).catch(() => { bell.muted = false; });
    }
  } catch (e) {}
}
function tick() {
  if (!ac) return;
  try {
    if (ac.state !== 'running') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.frequency.value = 880; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.4, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .17);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .18);
  } catch (e) {}
}
function beep(times = 3) {
  if (navigator.vibrate) navigator.vibrate(times > 1 ? [180, 90, 180] : 120);
  if (!S.settings.sound) return;
  if (times === 1) { tick(); return; }
  if (bell) { bell.muted = false; bell.currentTime = 0; const r = bell.play(); if (r) r.catch(() => tick()); }
  else tick();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') bellReady = false; });
async function keepAwake() { try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {} }
function releaseAwake() { try { wake && wake.release(); } catch (e) {} wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ui.view === 'workout') keepAwake(); });

/* ---------- 今日 ---------- */
const LIFTER = `<svg class="lifter" viewBox="0 0 64 64" role="img" aria-label="举重的小人" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="#3a3636" stroke-width="3.4">
    <circle cx="32" cy="19" r="5" fill="#3a3636" stroke="none"><animate attributeName="cy" values="21;18;18;21" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></circle>
    <line x1="32" x2="32" y1="27" y2="44"><animate attributeName="y1" values="29;26;26;29" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/><animate attributeName="y2" values="46;43;43;46" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></line>
    <polyline points="32,46 20,50 22,61"><animate attributeName="points" values="32,46 20,50 22,61;32,43 26,52 25,61;32,43 26,52 25,61;32,46 20,50 22,61" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></polyline>
    <polyline points="32,46 43,50 40,61"><animate attributeName="points" values="32,46 44,50 42,61;32,43 38,52 39,61;32,43 38,52 39,61;32,46 44,50 42,61" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></polyline>
    <polyline points="32,30 17,36 21,31"><animate attributeName="points" values="32,30 17,37 21,31;32,27 22,18 21,7;32,27 22,18 21,7;32,30 17,37 21,31" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></polyline>
    <polyline points="32,30 47,36 43,31"><animate attributeName="points" values="32,30 47,37 43,31;32,27 42,18 43,7;32,27 42,18 43,7;32,30 47,37 43,31" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/></polyline>
  </g>
  <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -24;0 -24;0 0" keyTimes="0;.4;.65;1" dur="1.8s" repeatCount="indefinite"/>
    <line x1="6" x2="58" y1="31" y2="31" stroke="#9ba6b2" stroke-width="3"/>
    <rect x="5" y="23" width="5" height="16" rx="2" fill="#b04f69"/><rect x="54" y="23" width="5" height="16" rx="2" fill="#b04f69"/>
  </g>
</svg>`;
function weekStrip() {
  const start = monday(new Date()), todayS = ymd(); let cells = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i), ds = ymd(d), ss = finished().filter(s => s.date === ds), s = ss[0];
    cells += `<div class="${ds === todayS ? 'now' : ''}">${WD[d.getDay()].slice(1)}<i class="${s ? 'has ' + s.day : ''}">${s ? s.day[1] : d.getDate()}</i></div>`;
  }
  return `<div class="week">${cells}</div>`;
}
const inWeek = (s, st) => { const d = fromYmd(s.date); return d >= st && d < addDays(st, 7); };
function viewToday() {
  const act = activeSession();
  if (!ui.pick) ui.pick = nextDay();
  const day = ui.pick, D = DAYS[day], est = estimate(day), all = finished();
  const wk = all.filter(s => inWeek(s, monday(new Date())));
  const wkKcal = wk.reduce((a, s) => a + calc(s).kcal, 0), d = new Date();
  const todayDone = all.filter(s => s.date === ymd());
  const needBackup = all.length >= 3 && (!S.settings.lastBackup || Date.now() - S.settings.lastBackup > 30 * 864e5);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
  const lastTrap = all.find(s => s.trap);
  const planHasTrap = S.plan[day].some(i => getEx(i.ex).trap);
  return `
  <div class="row between" style="margin-bottom:12px;align-items:flex-start">
    <div><div class="h-title">${d.getMonth() + 1}月${d.getDate()}日 ${WD[d.getDay()]}</div>
      <div class="cheer"><span>Irina 你给我好好练！</span>${LIFTER}</div></div>
    <button class="iconbtn" data-a="settings" aria-label="设置">${ICON.gear}</button>
  </div>
  ${ios && !standalone && !S.settings.hideInstall ? `<div class="banner row"><div class="grow">用 Safari 点底部分享按钮，选“添加到主屏幕”，就能像 App 一样打开。</div><button class="link small" data-a="hideInstall">知道了</button></div>` : ''}
  ${needBackup ? `<div class="banner row"><div class="grow">已经记了 ${all.length} 次训练，备份一下更安心。</div><button class="link small" data-a="exportData">备份</button></div>` : ''}
  ${act ? `<div class="card ${act.day}"><div class="muted small">训练进行中</div><div style="font-size:22px;font-weight:700;color:var(--c);margin:2px 0 12px">${DAYS[act.day].label} · ${DAYS[act.day].title}</div><button class="btn" data-a="resume" style="margin-bottom:8px">继续训练</button><div class="row"><button class="btn soft" data-a="switchAsk">换一练</button><button class="btn soft" data-a="discardAsk">放弃这次</button></div></div>` : `
  <section class="card hero ${day}">
    <div class="seg" role="tablist">${Object.keys(DAYS).map(k => `<button class="${k === day ? 'on' : ''}" data-a="pick" data-v="${k}">${DAYS[k].label}${k === nextDay() ? ' · 下一练' : ''}</button>`).join('')}</div>
    <h2>${D.title}</h2>
    <div class="muted small" style="margin-top:2px">${D.focus}</div>
    <div class="strip">${S.plan[day].filter(i => img(i.ex)).slice(0, 4).map(i => `<img src="${img(i.ex)}" alt="">`).join('')}</div>
    <div class="small muted" style="margin-bottom:12px">${S.plan[day].length} 个动作 · 约 ${est.min} 分钟 · 约 ${Math.round(est.kcal / 10) * 10} kcal</div>
    ${lastTrap && lastTrap.trap === 'yes' && planHasTrap ? `<div class="trap" style="margin:0 0 12px"><b>上次斜方肌抢力了</b><span>今天背部动作先减 5 lb，把沉肩做对。</span></div>` : ''}
    <button class="btn" data-a="start">开始训练</button>
  </section>`}
  ${todayDone.length ? `<button class="sess ${todayDone[0].day}" data-a="openSession" data-id="${todayDone[0].id}"><span class="dot">${todayDone[0].day[1]}</span><span class="grow"><span class="ttl">今天已完成 ${DAYS[todayDone[0].day].title}</span><br><span class="small muted">${calc(todayDone[0]).sets} 组 · ${kcalText(calc(todayDone[0]).kcal)} kcal</span></span></button>` : ''}
  <section class="card">
    <div class="row between"><b>本周 ${wk.length} / 3 练</b><span class="small muted">${wkKcal ? kcalText(wkKcal) + ' kcal' : '还没开始'}</span></div>
    ${weekStrip()}
  </section>
  <button class="btn soft" data-a="backfill">补记一次过去的训练</button>`;
}

/* ---------- 训练页 ---------- */
function setRow(e, ex, i, j, it) {
  const st = e.sets[j], side = ex.perSide ? '/边' : '';
  if (ex.type === 'time') return `<div class="setrow timed ${st.done ? 'done' : ''}">
      <span class="n">${j + 1}</span>
      <label class="fld"><input inputmode="numeric" pattern="[0-9]*" placeholder="${e.low}" value="${esc(st.sec)}" data-in="set" data-i="${i}" data-j="${j}" data-f="sec" aria-label="第${j + 1}组秒数"><em>秒${side}</em></label>
      <button class="play" data-a="startTimer" data-i="${i}" data-j="${j}" aria-label="开始计时">${ICON.play}</button>
      <button class="check ${st.done ? 'on' : ''}" data-a="toggleSet" data-i="${i}" data-j="${j}" aria-label="完成第${j + 1}组">${ICON.check}</button></div>`;
  const needLb = ex.type !== 'body';
  return `<div class="setrow ${st.done ? 'done' : ''}">
      <span class="n">${j + 1}</span>
      <label class="fld" id="lb-${i}-${j}"><input inputmode="decimal" placeholder="${needLb ? '' : '自重'}" value="${esc(st.lb)}" data-in="set" data-i="${i}" data-j="${j}" data-f="lb" aria-label="第${j + 1}组重量"><em>${ex.type === 'assist' ? '辅助' : 'lb'}</em></label>
      <label class="fld"><input inputmode="numeric" pattern="[0-9]*" placeholder="${e.high}" value="${esc(st.reps)}" data-in="set" data-i="${i}" data-j="${j}" data-f="reps" aria-label="第${j + 1}组次数"><em>个${side}</em></label>
      <button class="check ${st.done ? 'on' : ''}" data-a="toggleSet" data-i="${i}" data-j="${j}" aria-label="完成第${j + 1}组">${ICON.check}</button></div>`;
}
function howto(ex) {
  if (!ex.setup && !ex.action && !ex.tip) return '';
  return `<div class="howto">
    ${ex.setup ? `<div><span class="tag">姿势</span><span>${esc(ex.setup)}</span></div>` : ''}
    ${ex.action ? `<div><span class="tag act">动作</span><span>${esc(ex.action)}</span></div>` : ''}
    ${ex.tip ? `<div><span class="tag tip">要点</span><span>${esc(ex.tip)}</span></div>` : ''}
  </div>`;
}
function exCard(s, e, i) {
  const ex = getEx(e.ex), doneN = e.sets.filter(t => t.done).length, full = doneN >= e.sets.length && e.sets.length > 0, open = ui.open === i;
  const it = { sets: e.target, low: e.low, high: e.high };
  const last = lastFor(e.ex, s.id), sug = open && !s.done ? suggestion(it, ex, last) : null;
  return `<article class="card ex ${full && !open ? 'complete' : ''}" id="ex-${i}">
    <button class="head" data-a="openEx" data-i="${i}" aria-expanded="${open}">
      ${thumb(e.ex)}
      <span class="grow"><h3>${esc(ex.name)}</h3><span class="target">${fmtTarget(it, ex)}</span>${ex.note ? `<span class="exnote">${esc(ex.note)}</span>` : ''}</span>
      <span class="count ${full ? 'full' : ''}">${doneN}/${e.sets.length}</span>
    </button>
    ${open ? `<div class="body">
      ${last ? `<div class="lastline">上次 ${short(last.date)}：${esc(fmtSets(ex, last.sets))}</div>` : ''}
      ${sug ? (sug.f ? `<button class="suggest" data-a="applySuggest" data-i="${i}" data-f="${sug.f}" data-v="${sug.v}"><span class="grow">${sug.text}</span><span>填入</span></button>` : `<div class="suggest">${sug.text}</div>`) : ''}
      ${e.sets.map((_, j) => setRow(e, ex, i, j, it)).join('')}
      ${ex.trap ? `<div class="trap"><b>防斜方肌</b><span>${esc(ex.trap)}</span></div>` : ''}
      <div class="exfoot">
        <button data-a="toggleHow" data-i="${i}">${ui.how[i] ? '收起动作说明' : '看动作说明'}</button>
        <span>${e.sets.length > 1 ? `<button data-a="removeSet" data-i="${i}">减一组</button>&nbsp;&nbsp;&nbsp;` : ''}<button data-a="addSet" data-i="${i}">加一组</button></span>
      </div>
      <div class="exline">${ex.alt ? `<button class="swap" data-a="swapEx" data-i="${i}">换成${esc(getEx(ex.alt).name)}</button>` : '<span></span>'}<button data-a="removeEx" data-i="${i}">今天不做</button></div>
      ${ui.how[i] ? `<div class="exhow">${img(e.ex) ? `<img src="${img(e.ex)}" alt="${esc(ex.name)}动作示意">` : ''}${howto(ex)}</div>` : ''}
    </div>` : ''}
  </article>`;
}
function viewWorkout() {
  const s = activeSession(), D = DAYS[s.day], c = calc(s), total = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  return `<div class="${s.day}">
  <header class="wtop">
    <div class="row">
      <button class="iconbtn" data-a="leaveWorkout" aria-label="返回">${ICON.back}</button>
      <div class="grow">
        ${s.done ? `<div class="title">${D.label} · ${D.title}</div>` : `<button class="titlebtn title" data-a="switchAsk" aria-label="换一练">${D.label} · ${D.title} ▾</button>`}
        <div class="live">${s.done ? '修改记录' : s.manual ? '补记 ' + short(s.date) : `<span id="elapsed">${mmss(sessionSec(s))}</span>`} · <span id="livekcal">${kcalText(c.kcal)}</span> kcal</div>
      </div>
      <button class="btn sm" data-a="finishAsk">${s.done ? '保存' : '完成'}</button>
    </div>
    <div class="bar"><i id="pbar" style="width:${total ? c.sets / total * 100 : 0}%"></i></div>
  </header>
  ${s.exercises.map((e, i) => exCard(s, e, i)).join('')}
  <button class="btn soft" data-a="addExercise" data-to="session">加一个动作</button>
  </div>`;
}
const actions = {
  start() { const d = ui.pick; ui.pick = null; startSession(d); },
  pick(ds) { ui.pick = ds.v; render(); },
  resume() { ui.view = 'workout'; keepAwake(); render(); scrollTo(0, 0); },
  openEx(ds) { const i = +ds.i; ui.open = ui.open === i ? -1 : i; render(); },
  toggleHow(ds) { ui.how[ds.i] = !ui.how[ds.i]; render(); },
  addSet(ds) {
    const e = activeSession().exercises[ds.i], l = e.sets[e.sets.length - 1];
    e.sets.push({ lb: l ? l.lb : '', reps: l ? l.reps : '', sec: l ? l.sec : '', done: false }); save(); render();
  },
  removeSet(ds) {
    const e = activeSession().exercises[ds.i];
    let k = -1; for (let j = e.sets.length - 1; j >= 0; j--) if (!e.sets[j].done) { k = j; break; }
    if (k < 0) k = e.sets.length - 1;
    e.sets.splice(k, 1); save(); render();
  },
  removeEx(ds) {
    const s = activeSession(), i = +ds.i, e = s.exercises[i], nm = getEx(e.ex).name;
    const go = () => {
      s.exercises.splice(i, 1); ui.how = {};
      if (ui.open === i) ui.open = s.exercises.findIndex(x => x.sets.some(t => !t.done));
      else if (ui.open > i) ui.open--;
      save(); render(); toast(`这次不做${nm}，计划不受影响`);
    };
    if (e.sets.some(t => t.done)) confirmSheet(`去掉“${nm}”？这个动作已经填的组也会一起去掉。`, '去掉', go); else go();
  },
  swapEx(ds) {
    const s = activeSession(), e = s.exercises[ds.i], alt = getEx(e.ex).alt, ax = getEx(alt), last = lastFor(alt, s.id);
    const lb = ax.type === 'body' ? '' : ((last && num(last.sets[0].lb)) || '');
    e.ex = alt; e.sets.forEach(t => { t.lb = lb; if (ax.type !== 'body' && lb === '') t.done = false; });
    save(); render(); toast(`这次改成${ax.name}`);
  },
  switchAsk() {
    const s = activeSession(), other = Object.keys(DAYS).filter(k => k !== s.day);
    showSheet(`<div class="sheet-title">换一练</div><p class="muted small" style="margin:-6px 2px 12px">现在是 ${DAYS[s.day].label} · ${DAYS[s.day].title}。</p>
      ${other.map(k => `<div class="${k}" style="margin-bottom:8px"><button class="btn" data-a="switchDay" data-v="${k}">换成 ${DAYS[k].label} · ${DAYS[k].title}</button></div>`).join('')}
      <button class="btn danger" data-a="discardAsk">放弃这次训练</button>`);
  },
  switchDay(ds) {
    const s = activeSession(), n = calc(s).sets;
    const go = () => { s.day = ds.v; s.exercises = S.plan[ds.v].map(it => buildExercise(it, s.id)); ui.open = 0; ui.how = {}; ui.rest = null; save(); closeSheet(); drawRest(); render(); scrollTo(0, 0); toast(`已换成 ${DAYS[ds.v].label}`); };
    if (n) confirmSheet(`换成 ${DAYS[ds.v].label}？已经打卡的 ${n} 组会清掉。`, '换', go); else go();
  },
  restSystem() {
    location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('三练休息');
  },
  sysTimerHelp() {
    showSheet(`<div class="sheet-title">系统计时器（灵动岛）</div>
      <p class="muted small" style="margin:-6px 2px 12px">设置一次就行。打开后，休息条上会多一个“系统”按钮，点一下就启动手机自带的计时器，切到别的 App 也会到点响铃。</p>
      <div class="card small"><b>第一步：建一个快捷指令</b>
        <p class="muted" style="margin-top:6px">1. 打开手机自带的“快捷指令”App，点右上角 +。<br>2. 点“添加操作”，搜索“计时器”，选“启动计时器”。<br>3. 把时间改成你的休息时长，比如 1 分钟。<br>4. 点顶部的名称，改成 <b>三练休息</b>（要一字不差），点“完成”。</p></div>
      <div class="form"><div class="formrow"><span>第二步：打开联动</span><button class="link" data-a="toggleSysTimer">${S.settings.sysTimer ? '已打开' : '未打开'}</button></div></div>
      <p class="tiny" style="margin:-6px 2px 12px">点“系统”后会跳到快捷指令 App，计时器启动后，再切回三练就行。</p>
      <button class="btn soft" data-a="settings">返回设置</button>`);
  },
  toggleSysTimer() { S.settings.sysTimer = !S.settings.sysTimer; save(); actions.sysTimerHelp(); },
  soundMode() { S.settings.soundMode = S.settings.soundMode === 'mix' ? 'loud' : 'mix'; applyAudioSession(); bellReady = false; save(); drawSettings(); },
  pushToggle() {
    if (S.settings.pushOn) { S.settings.pushOn = false; save(); drawSettings(); return; }
    pushEnable();
  },
  testSound() { unlockAudio(); setTimeout(() => beep(3), 300); },
  applySuggest(ds) {
    const e = activeSession().exercises[ds.i];
    e.sets.forEach(t => { if (!t.done) t[ds.f] = +ds.v; }); save(); render(); toast('已填入还没做的组');
  },
  toggleSet(ds) {
    const s = activeSession(), i = +ds.i, j = +ds.j, e = s.exercises[i], ex = getEx(e.ex), st = e.sets[j];
    if (st.done) { st.done = false; save(); render(); return; }
    if ((ex.type === 'weight' || ex.type === 'assist') && st.lb === '') {
      const f = document.getElementById(`lb-${i}-${j}`); if (f) { f.classList.add('bad'); f.querySelector('input').focus(); }
      toast(ex.type === 'assist' ? '先填辅助重量' : '先填重量'); return;
    }
    completeSet(s, i, j);
  },
  startTimer(ds) {
    const s = activeSession(), i = +ds.i, j = +ds.j, e = s.exercises[i], ex = getEx(e.ex), sec = num(e.sets[j].sec) || e.low;
    const ph = [{ label: '准备', sec: 3 }];
    if (ex.perSide) ph.push({ label: '左边', sec, work: true }, { label: '换边', sec: 5 }, { label: '右边', sec, work: true });
    else ph.push({ label: '坚持住', sec, work: true });
    ui.timer = { i, j, sec, ph, idx: 0, end: Date.now() + 3000, name: ex.name };
    beep(1); drawTimer();
  },
  stopTimer() {
    const t = ui.timer; if (!t) return;
    const p = t.ph[t.idx], el = Math.round(p.sec - (t.end - Date.now()) / 1000);
    ui.timer = null; drawTimer();
    if (p.work && el >= 1) { const s = activeSession(); s.exercises[t.i].sets[t.j].sec = el; completeSet(s, t.i, t.j); }
  },
  restAdd(ds) { if (ui.rest) { ui.rest.end += +ds.v * 1000; ui.rest.over = false; drawRest(); pushSchedule(); } },
  restSkip() { if (ui.rest && !ui.rest.over) pushCancel(); ui.rest = null; drawRest(); },
  leaveWorkout() {
    if (ui.rest && !ui.rest.over) pushCancel();
    const s = activeSession();
    if (s && s.done) {
      if (ui.snap) { Object.assign(s, clone(ui.snap)); ui.snap = null; }
      S.active = null; save();
    }
    ui.view = 'tabs'; ui.rest = null; drawRest(); releaseAwake(); render(); scrollTo(0, 0);
  },
  finishAsk() {
    const s = activeSession(), c = calc(s);
    const mins = s.durationMin || Math.max(1, Math.round(((s.lastSetAt || Date.now()) - s.startedAt) / 60000));
    ui.f = { date: s.date, day: s.day, dur: mins, feel: s.feel, trap: s.trap, note: s.note || '', saveStd: null };
    drawFinish();
  },
  fChip(ds) { ui.f[ds.k] = ui.f[ds.k] === ds.v ? null : ds.v; drawFinish(); },
  finishSave() {
    const s = activeSession(), f = ui.f, c0 = calc(s);
    if (!c0.sets) { toast('还没有完成任何一组'); return; }
    if (ui.rest && !ui.rest.over) pushCancel();
    if (!f.date) { toast('请选择日期'); return; }
    if (f.saveStd === 'yes') stdDiffs(s).forEach(d => { d.it.lb = d.lb; });
    if (f.day) s.day = f.day;
    s.date = f.date; s.durationMin = Math.max(1, Math.round(num(f.dur)) || 1); s.feel = f.feel; s.trap = f.trap; s.note = f.note;
    s.exercises = s.exercises.filter(e => e.sets.some(t => t.done));
    const wasEdit = s.done, prs = wasEdit ? [] : findPRs(s), prev = finished().find(x => x.day === s.day && x.id !== s.id);
    s.done = true; s.endedAt = s.endedAt || Date.now(); S.active = null; ui.snap = null; ui.rest = null;
    save(); drawRest(); releaseAwake(); ui.view = 'tabs';
    if (wasEdit) { closeSheet(); render(); toast('已保存修改'); return; }
    ui.tab = 'today'; render(); scrollTo(0, 0); drawSummary(s, prs, prev);
  },
  discardAsk() {
    confirmSheet('放弃这次训练？已经填的内容不会保存。', '放弃', () => {
      S.sessions = S.sessions.filter(s => s.id !== S.active); S.active = null; ui.view = 'tabs'; if (ui.rest && !ui.rest.over) pushCancel(); ui.rest = null;
      save(); drawRest(); releaseAwake(); render(); scrollTo(0, 0);
    });
  },
  closeSheet() { closeSheet(); },
  maskClose() { if (!ui.lockSheet) closeSheet(); },
  nav(ds) { ui.tab = ds.v; render(); scrollTo(0, 0); },

  /* 补记 */
  backfill(ds) {
    const d = ui.pick || nextDay(), dt = (ds && ds.date) || ymd(addDays(new Date(), -1));
    showSheet(`<div class="${d}"><div class="sheet-title">补记一次训练</div>
      <div class="form"><div class="formrow"><span>日期</span><input type="date" id="bfDate" max="${ymd()}" value="${dt}"></div>
      <div class="formrow"><span>练的是</span><select id="bfDay">${Object.keys(DAYS).map(k => `<option value="${k}" ${k === d ? 'selected' : ''}>${DAYS[k].label} ${DAYS[k].title}</option>`).join('')}</select></div></div>
      <button class="btn" data-a="backfillGo">开始填写</button></div>`);
  },
  backfillGo() { const dt = $('#bfDate').value, dy = $('#bfDay').value; if (!dt) { toast('请选择日期'); return; } closeSheet(); startSession(dy, dt, true); },

  /* 历史 */
  calMove(ds) { const [y, m] = ui.cal; const d = new Date(y, m + +ds.v, 1); ui.cal = [d.getFullYear(), d.getMonth()]; render(); },
  openSession(ds) { drawSession(S.sessions.find(s => s.id === ds.id)); },
  editSession(ds) {
    if (activeSession()) { toast('请先结束正在进行的训练'); return; }
    const s = S.sessions.find(x => x.id === ds.id); ui.snap = clone(s); S.active = s.id; ui.view = 'workout'; ui.open = 0; ui.how = {};
    closeSheet(); save(); render(); scrollTo(0, 0);
  },
  deleteSession(ds) {
    confirmSheet('删除这条训练记录？删除后不能恢复。', '删除', () => { S.sessions = S.sessions.filter(s => s.id !== ds.id); save(); render(); });
  },

  /* 进度 */
  range(ds) { ui.range = +ds.v; render(); },
  bodyAdd() { drawBodyForm(); },
  bodySave() {
    const date = $('#bDate').value; if (!date) { toast('请选择日期'); return; }
    const e = { id: uid(), date }; let any = false;
    Object.keys(BODY_METRICS).forEach(k => { const v = num($('#b-' + k).value); if (v > 0) { e[k] = v; any = true; } });
    if (!any) { toast('至少填一项'); return; }
    S.body.push(e);
    if (e.weightLb && date >= S.body.filter(b => b.weightLb && b !== e).reduce((a, b) => a > b.date ? a : b.date, '')) S.settings.weightLb = e.weightLb;
    save(); closeSheet(); render();
  },
  bodyDel(ds) { confirmSheet('删除这条身体数据？', '删除', () => { S.body = S.body.filter(b => b.id !== ds.id); save(); render(); }); },

  /* 计划 */
  planDay(ds) { ui.planDay = ds.v; render(); },
  planItem(ds) { drawPlanItem(ui.planDay, +ds.i); },
  planMove(ds) {
    const p = S.plan[ui.planDay], i = +ds.i, j = i + +ds.v; if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j], p[i]]; save(); render(); drawPlanItem(ui.planDay, j);
  },
  planRemove(ds) {
    const nm = getEx(S.plan[ui.planDay][+ds.i].ex).name;
    confirmSheet(`从计划里移除“${nm}”？以前的记录不受影响。`, '移除', () => { S.plan[ui.planDay].splice(+ds.i, 1); save(); render(); });
  },
  planSwap(ds) { const it = S.plan[ui.planDay][+ds.i]; it.ex = getEx(it.ex).alt; delete it.lb; save(); render(); drawPlanItem(ui.planDay, +ds.i); },
  planReset() { confirmSheet('把三天的计划恢复成原始版本？训练记录不受影响。', '恢复', () => { S.plan = clone(PLAN); save(); render(); }); },
  addExercise(ds) { ui.add = { to: ds.to, pickId: '', name: '', type: 'weight', perSide: '0', goal: 'arm', sets: 3, low: 10, high: 12 }; drawAdd(); },
  addSave() {
    const a = ui.add; let id = a.pickId;
    if (!id) {
      if (!a.name.trim()) { toast('请填动作名称'); return; }
      id = 'c-' + uid();
      S.customEx[id] = { name: a.name.trim(), type: a.type, perSide: a.perSide === '1', goal: a.goal, met: a.type === 'weight' ? 4 : 3.8, step: 5 };
    }
    const low = Math.max(1, Math.round(num(a.low))), it = { ex: id, sets: Math.max(1, Math.round(num(a.sets))), low, high: Math.max(low, Math.round(num(a.high))) };
    if (a.pickId && a.lb !== undefined) it.lb = a.lb;
    if (a.to === 'session') { const s = activeSession(); s.exercises.push(buildExercise(it, s.id)); ui.open = s.exercises.length - 1; }
    else S.plan[ui.planDay].push(it);
    save(); closeSheet(); render();
    if (a.to === 'session') document.getElementById('ex-' + ui.open)?.scrollIntoView({ block: 'center' });
  },

  /* 设置 */
  settings() { drawSettings(); },
  hideInstall() { S.settings.hideInstall = true; save(); render(); },
  toggleSound() { S.settings.sound = !S.settings.sound; save(); drawSettings(); },
  exportData() { exportData(); },
  importPick() { $('#importFile').click(); },
  onboardGo() {
    const w = num($('#obWeight').value);
    if (w < 60 || w > 400) { toast('请填一个合理的体重（磅）'); return; }
    S.settings.weightLb = w; S.settings.onboarded = true; ui.lockSheet = false; save(); closeSheet(); render();
  },
};
function completeSet(s, i, j) {
  const e = s.exercises[i], ex = getEx(e.ex), st = e.sets[j];
  if (ex.type === 'time') st.sec = num(st.sec) || e.low;
  else st.reps = num(st.reps) || e.high;
  st.done = true; s.lastSetAt = Date.now();
  if (e.sets.every(t => t.done)) {
    const n = s.exercises.findIndex((x, k) => k > i && x.sets.some(t => !t.done));
    const any = n >= 0 ? n : s.exercises.findIndex(x => x.sets.some(t => !t.done));
    ui.open = any;
    save(); render();
    if (any >= 0) document.getElementById('ex-' + any)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    else toast('全部完成，点右上角“完成”保存');
  } else { save(); render(); }
  if (!s.done && !s.manual && s.exercises.some(x => x.sets.some(t => !t.done))) { ui.rest = { end: Date.now() + S.settings.restSec * 1000, over: false }; drawRest(); pushSchedule(); }
}

/* ---------- 休息条与计时器 ---------- */
function drawRest() {
  const el = $('#rest'), r = ui.rest;
  if (!r || ui.view !== 'workout') { el.className = ''; el.innerHTML = ''; return; }
  const left = (r.end - Date.now()) / 1000;
  el.className = 'show' + (r.over ? ' over' : '');
  el.innerHTML = `<div><b id="restT">${r.over ? '开始' : mmss(left)}</b><span>${r.over ? '下一组' : '组间休息'}</span>
    ${r.over ? '' : `${S.settings.sysTimer ? '<button data-a="restSystem">系统</button>' : ''}<button data-a="restAdd" data-v="-15">−15</button><button data-a="restAdd" data-v="15">+15</button>`}<button data-a="restSkip">${r.over ? '好' : '跳过'}</button></div>`;
}
function drawTimer() {
  const el = $('#timer'), t = ui.timer;
  if (!t) { el.className = ''; el.innerHTML = ''; return; }
  const s = activeSession(), p = t.ph[t.idx];
  el.className = 'show ' + s.day;
  el.innerHTML = `<div class="ph" id="tPh">${p.label}</div><div class="clock" id="tClock">${Math.ceil((t.end - Date.now()) / 1000)}</div><div class="nm">${esc(t.name)}${t.ph.length > 2 ? ` · 每边 ${t.sec} 秒` : ` · ${t.sec} 秒`}</div><button data-a="stopTimer">提前结束</button>`;
}
setInterval(() => {
  const t = ui.timer;
  if (t) {
    if (Date.now() >= t.end) {
      if (t.idx + 1 < t.ph.length) { t.idx++; t.end = Date.now() + t.ph[t.idx].sec * 1000; beep(1); drawTimer(); }
      else { ui.timer = null; drawTimer(); beep(3); const s = activeSession(); s.exercises[t.i].sets[t.j].sec = t.sec; completeSet(s, t.i, t.j); }
    } else { const c = $('#tClock'); if (c) c.textContent = Math.ceil((t.end - Date.now()) / 1000); }
  }
  const r = ui.rest;
  if (r && ui.view === 'workout') {
    if (!r.over && document.visibilityState === 'visible' && r.end - Date.now() < 2500) pushCancel();
    if (!r.over && Date.now() >= r.end) { r.over = true; beep(3); drawRest(); setTimeout(() => { if (ui.rest === r) { ui.rest = null; drawRest(); } }, 15000); }
    else if (!r.over) { const c = $('#restT'); if (c) c.textContent = mmss((r.end - Date.now()) / 1000); }
  }
  if (ui.view === 'workout') {
    const s = activeSession(); if (!s || s.done || s.manual) return;
    const c = $('#elapsed'); if (c) c.textContent = mmss(sessionSec(s));
    const k = $('#livekcal'); if (k) k.textContent = kcalText(calc(s).kcal);
  }
}, 250);

/* ---------- 弹层 ---------- */
function showSheet(html) {
  const el = $('#sheet'); el.className = 'show';
  el.innerHTML = `<div class="mask" data-a="maskClose"></div><div class="panel" role="dialog" aria-modal="true">${ui.lockSheet ? '' : '<div class="sheet-bar"><button class="sheet-x" data-a="closeSheet" aria-label="关闭"><span>×</span></button></div>'}<div class="grab"></div>${html}</div>`;
}
function closeSheet() { const el = $('#sheet'); el.className = ''; el.innerHTML = ''; }
/* 从中间往下拉关闭弹层 */
(() => {
  let d = null;
  document.addEventListener('touchstart', e => {
    const p = e.target.closest && e.target.closest('#sheet .panel');
    if (!p || ui.lockSheet || p.scrollTop > 0 || e.target.closest('input,textarea,select')) { d = null; return; }
    d = { p, y: e.touches[0].clientY, t: Date.now(), on: false, dy: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (e.target.closest && e.target.closest('#sheet .mask')) { e.preventDefault(); return; }
    if (!d) return;
    const dy = e.touches[0].clientY - d.y;
    if (!d.on) { if (dy < -4) { d = null; return; } if (dy < 6) return; d.on = true; d.p.classList.remove('back'); }
    e.preventDefault(); d.dy = dy; d.p.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const end = () => {
    if (!d || !d.on) { d = null; return; }
    const { p, dy, t } = d; d = null;
    if (dy > 90 || (dy > 30 && dy / (Date.now() - t) > .5)) { p.classList.add('closing'); setTimeout(closeSheet, 170); }
    else { p.classList.add('back'); p.style.transform = ''; }
  };
  document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
})();
let confirmFn = null;
actions.confirmOk = () => { const f = confirmFn; confirmFn = null; closeSheet(); f && f(); };
function confirmSheet(msg, ok, fn) {
  confirmFn = fn;
  showSheet(`<div style="font-size:17px;font-weight:600;margin:4px 2px 16px">${esc(msg)}</div>
    <button class="btn" style="--c:#b23b3b;margin-bottom:8px" data-a="confirmOk">${esc(ok)}</button><button class="btn soft" data-a="closeSheet">取消</button>`);
}
function stdDiffs(s) {
  const out = [];
  (S.plan[s.day] || []).forEach(it => {
    if (it.lb === undefined || it.lb === '') return;
    const e = s.exercises.find(x => x.ex === it.ex), ex = getEx(it.ex); if (!e || ex.type === 'body' || ex.type === 'time') return;
    const lb = bestValue(ex, e); if (lb != null && lb !== it.lb) out.push({ it, lb, name: ex.name });
  });
  return out;
}
const chip = (k, v, label) => `<button class="${ui.f[k] === v ? 'on' : ''}" data-a="fChip" data-k="${k}" data-v="${v}">${label}</button>`;
function drawFinish() {
  const s = activeSession(), f = ui.f, c = calc(s, num(f.dur) * 60);
  const hasTrap = s.exercises.some(e => getEx(e.ex).trap && e.sets.some(t => t.done));
  showSheet(`<div class="${s.day}"><div class="sheet-title">${s.done ? '修改记录' : '这次练得怎么样？'}</div>
    <div class="stats" style="margin-bottom:14px">
      <div class="card"><div class="stat" id="fKcal">${kcalText(c.kcal)}</div><div class="tiny">kcal（估算）</div></div>
      <div class="card"><div class="stat">${c.sets}</div><div class="tiny">完成组数</div></div>
      <div class="card"><div class="stat">${Math.round(c.volume).toLocaleString()}</div><div class="tiny">总重量 lb</div></div>
    </div>
    <div class="form">
      <div class="formrow"><span>日期</span><input type="date" value="${f.date}" max="${ymd()}" data-in="f" data-f="date"></div>
      <div class="formrow"><span>这是哪一练</span><select data-in="f" data-f="day" aria-label="这是哪一练">${Object.keys(DAYS).map(k => `<option value="${k}" ${f.day === k ? 'selected' : ''}>${DAYS[k].label}</option>`).join('')}</select></div>
      <div class="formrow"><span>训练时长（分钟）</span><input inputmode="numeric" pattern="[0-9]*" value="${esc(f.dur)}" data-in="f" data-f="dur" aria-label="训练时长"></div>
    </div>
    <div class="label">整体感受</div>
    <div class="chips">${chip('feel', 'easy', '轻松')}${chip('feel', 'good', '刚好')}${chip('feel', 'hard', '很累')}</div>
    ${hasTrap ? `<div class="label">练背时斜方肌有没有抢着发力？</div><div class="chips">${chip('trap', 'no', '没有')}${chip('trap', 'yes', '有一点')}</div>` : ''}
    ${!s.done && stdDiffs(s).length ? `<div class="label">这次重量和默认不一样，存成以后的默认吗？</div><p class="tiny" style="margin:-3px 2px 7px">${stdDiffs(s).map(d => `${esc(d.name)} ${d.it.lb} → ${d.lb} lb`).join('，')}</p><div class="chips">${chip('saveStd', 'yes', '存为新默认')}</div>` : ''}
    <textarea placeholder="备注（可选）：比如哪个动作不舒服" data-in="f" data-f="note">${esc(f.note)}</textarea>
    <button class="btn" data-a="finishSave" style="margin-bottom:8px">保存</button>
    ${s.done ? `<button class="btn soft" data-a="closeSheet">继续修改</button>` : `<button class="btn soft" data-a="closeSheet" style="margin-bottom:8px">继续练</button><button class="btn danger" data-a="discardAsk">放弃这次训练</button>`}
  </div>`);
}
function drawSummary(s, prs, prev) {
  const c = calc(s), pc = prev ? calc(prev) : null, wk = finished().filter(x => inWeek(x, monday(new Date()))).length;
  let cmp = '';
  if (pc && pc.volume > 0 && c.volume > 0) {
    const pct = Math.round((c.volume - pc.volume) / pc.volume * 100);
    cmp = pct > 0 ? `总重量比上次同一练多 ${pct}%` : pct < 0 ? `总重量比上次同一练少 ${-pct}%` : '总重量和上次同一练一样';
  }
  showSheet(`<div class="${s.day}"><div class="sheet-title" style="color:var(--c);font-size:26px">练完了！</div>
    <p class="muted" style="margin:-8px 0 14px">${DAYS[s.day].label} · ${DAYS[s.day].title} · 本周第 ${wk} 练${wk >= 3 ? '，本周目标达成' : ''}</p>
    <div class="stats" style="margin-bottom:14px">
      <div class="card"><div class="stat">${kcalText(c.kcal)}</div><div class="tiny">kcal（估算）</div></div>
      <div class="card"><div class="stat">${s.durationMin}</div><div class="tiny">分钟</div></div>
      <div class="card"><div class="stat">${c.sets}</div><div class="tiny">组</div></div>
    </div>
    ${cmp ? `<p class="small muted" style="margin:0 2px 12px">${cmp}</p>` : ''}
    ${prs.map(p => `<div class="pr"><b>新纪录</b><span class="grow">${esc(p.name)}</span><span>${p.assist ? '辅助 ' : ''}${p.from} → ${p.to} ${p.unit}</span></div>`).join('')}
    <button class="btn" data-a="closeSheet" style="margin-top:6px">好的</button></div>`);
}
function drawSession(s) {
  if (!s) return;
  const c = calc(s), feel = { easy: '轻松', good: '刚好', hard: '很累' }[s.feel];
  const per = Object.fromEntries(c.perEx.map(p => [p.ex, p.kcal]));
  showSheet(`<div class="${s.day}"><div class="sheet-title" style="margin-bottom:2px;color:var(--c)">${DAYS[s.day].label} · ${DAYS[s.day].title}</div>
    <p class="muted small" style="margin-bottom:12px">${fmtDate(s.date)} · ${s.durationMin || Math.round(sessionSec(s) / 60)} 分钟${feel ? ' · ' + feel : ''}${s.trap === 'yes' ? ' · 斜方肌有抢力' : ''}</p>
    <div class="stats" style="margin-bottom:14px">
      <div class="card"><div class="stat">${kcalText(c.kcal)}</div><div class="tiny">kcal（估算）</div></div>
      <div class="card"><div class="stat">${c.sets}</div><div class="tiny">组</div></div>
      <div class="card"><div class="stat">${Math.round(c.volume).toLocaleString()}</div><div class="tiny">总重量 lb</div></div>
    </div>
    <div class="card">${s.exercises.filter(e => e.sets.some(t => t.done)).map(e => { const ex = getEx(e.ex); return `<div class="exblock"><div class="row between"><span class="nm">${esc(ex.name)}</span><span class="tiny">${kcalText(per[e.ex] || 0)} kcal</span></div><div class="vals">${esc(fmtSets(ex, e.sets.filter(t => t.done)))}</div></div>`; }).join('')}</div>
    ${s.note ? `<div class="card small">${esc(s.note)}</div>` : ''}
    <button class="btn soft" data-a="editSession" data-id="${s.id}" style="margin-bottom:8px">修改</button>
    <button class="btn danger" data-a="deleteSession" data-id="${s.id}">删除这条记录</button></div>`);
}
function drawBodyForm() {
  const last = k => { const b = [...S.body].filter(x => x[k]).sort((a, c) => c.date.localeCompare(a.date))[0]; return b ? b[k] : ''; };
  showSheet(`<div class="sheet-title">记录身体数据</div><div class="form">
    <div class="formrow"><span>日期</span><input type="date" id="bDate" value="${ymd()}" max="${ymd()}"></div>
    ${Object.entries(BODY_METRICS).map(([k, m]) => `<div class="formrow"><span>${m.name}（${m.unit}）</span><input id="b-${k}" inputmode="decimal" placeholder="${last(k) || '—'}" aria-label="${m.name}"></div>`).join('')}
  </div><p class="tiny" style="margin:-6px 2px 12px">不用每项都填。上臂围量最粗处，建议每 2–4 周量一次，同一时间量更准。</p>
  <button class="btn" data-a="bodySave">保存</button>`);
}
function drawPlanItem(day, i) {
  const it = S.plan[day][i], ex = getEx(it.ex), unit = ex.type === 'time' ? '秒' : '个';
  showSheet(`<div class="${day}"><div class="sheet-title">${esc(ex.name)}</div>
    ${img(it.ex) ? `<img src="${img(it.ex)}" alt="" style="width:100%;max-width:260px;display:block;margin:0 auto 12px;border-radius:14px">` : ''}
    ${ex.setup ? `<div class="card">${howto(ex)}${ex.trap ? `<div class="trap"><b>防斜方肌</b><span>${esc(ex.trap)}</span></div>` : ''}</div>` : ''}
    <div class="form">
      ${ex.type === 'weight' || ex.type === 'assist' ? `<div class="formrow"><span>默认${ex.type === 'assist' ? '辅助' : ''}重量（lb）</span><input inputmode="decimal" value="${it.lb ?? ''}" placeholder="沿用上次" data-in="plan" data-i="${i}" data-f="lb" aria-label="默认重量"></div>` : ''}
      <div class="formrow"><span>组数</span><input inputmode="numeric" value="${it.sets}" data-in="plan" data-i="${i}" data-f="sets" aria-label="组数"></div>
      <div class="formrow"><span>最少 ${unit}${ex.perSide ? '/边' : ''}</span><input inputmode="numeric" value="${it.low}" data-in="plan" data-i="${i}" data-f="low" aria-label="最少"></div>
      <div class="formrow"><span>最多 ${unit}${ex.perSide ? '/边' : ''}</span><input inputmode="numeric" value="${it.high}" data-in="plan" data-i="${i}" data-f="high" aria-label="最多"></div>
    </div>
    <div class="row" style="margin-bottom:8px">
      <button class="btn soft" data-a="planMove" data-i="${i}" data-v="-1" ${i === 0 ? 'disabled style="opacity:.4"' : ''}>上移</button>
      <button class="btn soft" data-a="planMove" data-i="${i}" data-v="1" ${i === S.plan[day].length - 1 ? 'disabled style="opacity:.4"' : ''}>下移</button>
    </div>
    ${ex.alt ? `<button class="btn soft" data-a="planSwap" data-i="${i}" style="margin-bottom:8px">默认改成${esc(getEx(ex.alt).name)}</button>` : ''}
    <button class="btn" data-a="closeSheet" style="margin-bottom:8px">完成</button>
    <button class="btn danger" data-a="planRemove" data-i="${i}">从计划移除</button></div>`);
}
function drawAdd() {
  const a = ui.add, ids = [...Object.keys(EX), ...Object.keys(S.customEx)];
  const pick = a.pickId ? getEx(a.pickId) : null;
  const type = pick ? pick.type : a.type, unit = type === 'time' ? '秒' : '个';
  showSheet(`<div class="sheet-title">加一个动作</div><div class="form">
    <div class="formrow"><span>动作</span><select data-change="addPick" aria-label="选择动作"><option value="">＋ 新建动作</option>${ids.map(id => `<option value="${id}" ${a.pickId === id ? 'selected' : ''}>${esc(getEx(id).name)}</option>`).join('')}</select></div>
    ${pick ? '' : `<div class="formrow"><span>名称</span><input type="text" placeholder="比如 腿举" value="${esc(a.name)}" data-in="add" data-f="name"></div>
    <div class="formrow"><span>记录方式</span><select data-change="addField" data-f="type"><option value="weight" ${a.type === 'weight' ? 'selected' : ''}>重量 + 次数</option><option value="body" ${a.type === 'body' ? 'selected' : ''}>自重次数</option><option value="assist" ${a.type === 'assist' ? 'selected' : ''}>辅助重量</option><option value="time" ${a.type === 'time' ? 'selected' : ''}>按时间</option></select></div>
    <div class="formrow"><span>分左右边</span><select data-change="addField" data-f="perSide"><option value="0" ${a.perSide === '0' ? 'selected' : ''}>不分</option><option value="1" ${a.perSide === '1' ? 'selected' : ''}>分</option></select></div>
    <div class="formrow"><span>练的部位</span><select data-change="addField" data-f="goal">${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${a.goal === k ? 'selected' : ''}>${g.name}</option>`).join('')}</select></div>`}
    <div class="formrow"><span>组数</span><input inputmode="numeric" value="${a.sets}" data-in="add" data-f="sets" aria-label="组数"></div>
    <div class="formrow"><span>最少 ${unit}</span><input inputmode="numeric" value="${a.low}" data-in="add" data-f="low" aria-label="最少"></div>
    <div class="formrow"><span>最多 ${unit}</span><input inputmode="numeric" value="${a.high}" data-in="add" data-f="high" aria-label="最多"></div>
  </div><button class="btn" data-a="addSave">添加</button>`);
}
function drawSettings() {
  const s = S.settings;
  showSheet(`<div class="sheet-title">设置</div>
    <div class="form">
      <div class="formrow"><span>体重（lb，用来算热量）</span><input inputmode="decimal" value="${s.weightLb}" data-in="setting" data-f="weightLb" aria-label="体重"></div>
      <div class="formrow"><span>组间休息（秒）</span><input inputmode="numeric" value="${s.restSec}" data-in="setting" data-f="restSec" aria-label="组间休息"></div>
      <div class="formrow"><span>提示音</span><button class="link" data-a="toggleSound">${s.sound ? '开' : '关'}</button></div>
      <div class="formrow"><span class="grow">提示音方式<br><span class="tiny">${s.soundMode === 'mix' ? '不打断音乐，但手机静音时不响' : '手机静音也响，但可能暂停音乐'}</span></span><button class="link" data-a="soundMode">${s.soundMode === 'mix' ? '混音' : '响亮'}</button></div>
      <div class="formrow"><span>试听提示音</span><button class="link" data-a="testSound">播放</button></div>
      ${PUSH.url ? `<div class="formrow"><span class="grow">后台横幅提醒<br><span class="tiny">切到别的 App 时，休息结束也会弹通知</span></span><button class="link" data-a="pushToggle">${s.pushOn ? '已打开' : '打开'}</button></div>` : ''}
      <div class="formrow"><span>系统计时器（灵动岛）</span><button class="link" data-a="sysTimerHelp">${s.sysTimer ? '已打开' : '设置'}</button></div>
    </div>
    <div class="label">数据备份</div>
    <p class="small muted" style="margin:0 2px 10px">记录只存在这台手机上。换手机或清除 Safari 数据前一定要先备份。${s.lastBackup ? `上次备份：${short(ymd(new Date(s.lastBackup)))}` : '还没有备份过。'}</p>
    <div class="row" style="margin-bottom:14px"><button class="btn soft" data-a="exportData">备份</button><button class="btn soft" data-a="importPick">恢复</button></div>
    <input type="file" id="importFile" accept="application/json,.json" data-change="importFile" hidden>
    <details class="card small" style="padding:12px 14px"><summary style="font-weight:600">热量是怎么算的</summary>
      <p class="muted" style="margin-top:8px">热量 = MET × 体重（kg）× 时间（小时）。每个动作按次数（每次约 ${TEMPO} 秒）或秒数算发力时间，再加上组间休息（MET ${REST_MET}，每组最多计 3 分钟）。这是公式估算，实际可能差 20–30%，适合看趋势，不要拿来精确抵饮食。</p></details>`);
}
function onboard() {
  ui.lockSheet = true;
  showSheet(`<div class="sheet-title" style="font-size:26px;color:var(--d1)">欢迎来到三练</div>
    <p class="muted" style="margin:-6px 2px 14px">你的三天计划已经放进去了。填一下体重，用来估算热量，之后随时能改。</p>
    <div class="form"><div class="formrow"><span>体重（lb）</span><input id="obWeight" inputmode="decimal" value="${S.settings.weightLb}" aria-label="体重"></div></div>
    <button class="btn" data-a="onboardGo">开始</button>`);
}

/* ---------- 备份 ---------- */
async function exportData() {
  const name = `sanlian-backup-${ymd()}.json`, text = JSON.stringify(S, null, 2);
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: '三练备份' });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
    S.settings.lastBackup = Date.now(); save(); toast('备份文件已生成'); closeSheet(); render();
  } catch (e) { if (e.name !== 'AbortError') toast('备份失败，请再试一次'); }
}
function importFile(input) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result);
      if (!Array.isArray(o.sessions) || !o.plan || !o.settings) throw 0;
      confirmSheet(`恢复这份备份（${o.sessions.filter(s => s.done).length} 次训练）？现在手机上的数据会被替换。`, '恢复', () => {
        const d = defaults(); S = { ...d, ...o, settings: { ...d.settings, ...o.settings }, active: null };
        S.sessions = S.sessions.filter(s => s.done); ui.pick = null; save(); render(); toast('已恢复');
      });
    } catch (e) { toast('这不是有效的备份文件'); }
  };
  r.readAsText(f);
}

/* ---------- 历史 ---------- */
function viewHistory() {
  const now = new Date();
  if (!ui.cal) ui.cal = [now.getFullYear(), now.getMonth()];
  const [y, m] = ui.cal, first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, nDays = new Date(y, m + 1, 0).getDate();
  const all = finished(), inMonth = all.filter(s => { const d = fromYmd(s.date); return d.getFullYear() === y && d.getMonth() === m; });
  let cells = ['一', '二', '三', '四', '五', '六', '日'].map(w => `<div class="w">${w}</div>`).join('') + '<span class="blank"></span>'.repeat(lead);
  for (let d = 1; d <= nDays; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`, s = inMonth.find(x => x.date === ds);
    cells += s ? `<button class="has ${s.day}" data-a="openSession" data-id="${s.id}" aria-label="${fmtDate(ds)} ${DAYS[s.day].label}">${d}</button>` : (ds <= ymd() ? `<button class="${ds === ymd() ? 'today' : ''}" data-a="backfill" data-date="${ds}" aria-label="补记 ${fmtDate(ds)}">${d}</button>` : `<button disabled>${d}</button>`);
  }
  const isNow = y === now.getFullYear() && m === now.getMonth();
  return `<div class="h-title" style="margin-bottom:14px">历史</div>
  <section class="card">
    <div class="calhead"><button class="iconbtn" data-a="calMove" data-v="-1" aria-label="上个月">${ICON.back}</button><b>${y}年${m + 1}月</b><button class="iconbtn" data-a="calMove" data-v="1" aria-label="下个月" style="transform:scaleX(-1);${isNow ? 'visibility:hidden' : ''}">${ICON.back}</button></div>
    <div class="cal">${cells}</div>
    <div class="legend">${Object.keys(DAYS).map(k => `<span class="${k}"><i></i>${DAYS[k].label} ${DAYS[k].title}</span>`).join('')}</div>
  </section>
  ${inMonth.length ? inMonth.map(s => { const c = calc(s); return `<button class="sess ${s.day}" data-a="openSession" data-id="${s.id}"><span class="dot">${s.day[1]}</span><span class="grow"><span class="ttl">${DAYS[s.day].title}</span><br><span class="small muted">${fmtDate(s.date)} · ${s.durationMin || Math.round(sessionSec(s) / 60)} 分钟</span></span><span class="small muted">${kcalText(c.kcal)} kcal</span></button>`; }).join('') : `<div class="empty">这个月还没有记录</div>`}
  <button class="btn soft" data-a="backfill">补记一次过去的训练</button>
  <p class="tiny" style="text-align:center;margin-top:8px">点日历上的空白日期可以补记，点彩色日期可以修改或删除</p>`;
}

/* ---------- 图表 ---------- */
const charts = {}; let chartN = 0;
function niceTicks(lo, hi, n = 3) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p, st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const a = Math.floor(lo / st) * st, t = []; for (let v = a; v <= hi + st * .999; v += st) t.push(+v.toFixed(3));
  return t;
}
const W = 340, H = 172, PL = 36, PR = 14, PT = 20, PB = 24;
function axis(ticks, y, xLabels) {
  return ticks.map(t => `<line x1="${PL}" x2="${W - PR}" y1="${y(t)}" y2="${y(t)}" stroke="#f0e7e3"/><text x="${PL - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('') +
    xLabels.map(l => `<text x="${l.x}" y="${H - 6}" text-anchor="${l.a || 'middle'}">${l.t}</text>`).join('');
}
function lineChart(pts, unit) {
  // pts: [{t: ms, y, label}]
  const id = 'c' + (++chartN), vals = pts.map(p => p.y);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals)), lo = ticks[0], hi = ticks[ticks.length - 1];
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, x = t => t1 === t0 ? (PL + W - PR) / 2 : PL + 6 + (t - t0) / (t1 - t0) * (W - PR - PL - 12);
  const y = v => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const coords = pts.map(p => ({ x: x(p.t), y: y(p.y), tip: `${p.label}：${p.y} ${unit}` }));
  charts[id] = coords;
  const l = coords[coords.length - 1], labels = [{ x: coords[0].x, t: pts[0].label, a: 'start' }];
  if (pts.length > 1) labels.push({ x: l.x, t: pts[pts.length - 1].label, a: 'end' });
  const ax = Math.min(l.x, W - PR - 14);
  return `<div class="chart" data-chart="${id}"><div class="tipbox"></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit}变化趋势，最新 ${pts[pts.length - 1].y} ${unit}">
    ${axis(ticks, y, labels)}
    <line class="cross" y1="${PT}" y2="${H - PB}" stroke="#d8cbc6" style="display:none"/>
    <polyline fill="none" stroke="var(--c)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${coords.map(c => c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ')}"/>
    ${coords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="var(--c)" stroke="#fff" stroke-width="2"/>`).join('')}
    <text class="val" x="${ax}" y="${Math.max(12, l.y - 10)}" text-anchor="middle">${pts[pts.length - 1].y}</text>
  </svg></div>`;
}
function barChart(items) {
  // items: [{label, y, tip}]
  const id = 'c' + (++chartN), max = Math.max(...items.map(i => i.y), 1), ticks = niceTicks(0, max), hi = ticks[ticks.length - 1];
  const n = items.length, band = (W - PL - PR) / n, bw = Math.max(4, Math.min(18, band - 2));
  const y = v => PT + (1 - v / hi) * (H - PT - PB), base = y(0);
  const coords = items.map((it, i) => ({ x: PL + band * (i + .5), y: y(it.y), tip: it.tip }));
  charts[id] = coords;
  const every = Math.ceil(n / 4), labels = items.map((it, i) => ({ x: coords[i].x, t: it.label, i })).filter(l => (n - 1 - l.i) % every === 0);
  const bars = items.map((it, i) => {
    if (it.y <= 0) return '';
    const h = base - coords[i].y, r = Math.min(4, bw / 2, h), xl = coords[i].x - bw / 2;
    return `<path fill="var(--c)" d="M${xl} ${base}V${coords[i].y + r}Q${xl} ${coords[i].y} ${xl + r} ${coords[i].y}H${xl + bw - r}Q${xl + bw} ${coords[i].y} ${xl + bw} ${coords[i].y + r}V${base}Z"/>`;
  }).join('');
  const li = items.reduce((m, it, i) => it.y >= items[m].y ? i : m, 0), lastVal = items[li].y;
  return `<div class="chart" data-chart="${id}"><div class="tipbox"></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="每日热量柱状图">
    ${axis(ticks, y, labels)}${bars}
    ${lastVal > 0 ? `<text class="val" x="${Math.min(coords[li].x, W - PR - 10)}" y="${coords[li].y - 6}" text-anchor="middle">${Math.round(lastVal)}</text>` : ''}
    <line class="cross" y1="${PT}" y2="${H - PB}" stroke="#d8cbc6" style="display:none"/>
  </svg></div>`;
}
function chartPointer(ev) {
  const box = ev.target.closest && ev.target.closest('.chart'); if (!box) return;
  const cs = charts[box.dataset.chart]; if (!cs) return;
  const r = box.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * W;
  let best = cs[0]; cs.forEach(c => { if (Math.abs(c.x - vx) < Math.abs(best.x - vx)) best = c; });
  const tip = box.querySelector('.tipbox'), cross = box.querySelector('.cross');
  tip.textContent = best.tip; tip.style.display = 'block';
  const px = best.x / W * r.width, half = tip.offsetWidth / 2;
  tip.style.left = Math.max(half, Math.min(r.width - half, px)) + 'px'; tip.style.top = '-8px';
  cross.setAttribute('x1', best.x); cross.setAttribute('x2', best.x); cross.style.display = '';
}
document.addEventListener('pointermove', chartPointer);
document.addEventListener('pointerdown', chartPointer);
document.addEventListener('pointerout', ev => {
  const box = ev.target.closest && ev.target.closest('.chart'); if (!box || ev.pointerType === 'touch') return;
  if (box.contains(ev.relatedTarget)) return;
  box.querySelector('.tipbox').style.display = 'none'; box.querySelector('.cross').style.display = 'none';
});

/* ---------- 进度 ---------- */
function viewProgress() {
  const all = finished(), today0 = fromYmd(ymd()), R = ui.range;
  const head = `<div class="h-title" style="margin-bottom:14px">进度</div>`;
  const bodySec = bodySection();
  if (!all.length) return head + `<div class="card empty">练完第一次之后，这里会出现每日消耗、各部位组数和重量变化。</div>` + bodySec;
  const since = addDays(today0, -(R - 1)), end = addDays(today0, 1), prevSince = addDays(since, -R);
  const between = (a, b) => all.filter(s => { const d = fromYmd(s.date); return d >= a && d < b; });
  const inRange = between(since, end), prevRange = between(prevSince, since);
  const totalKcal = inRange.reduce((a, s) => a + calc(s).kcal, 0), totalSets = inRange.reduce((a, s) => a + calc(s).sets, 0);
  const rangeName = { 1: '今天', 7: '最近 7 天', 30: '最近 30 天' }[R], prevName = { 1: '昨天', 7: '上一周', 30: '上个月' }[R];

  let daily;
  if (R === 1) {
    const per = {};
    inRange.forEach(s => calc(s).perEx.forEach(p => { if (p.sets) per[p.ex] = (per[p.ex] || 0) + p.kcal; }));
    const rows = Object.entries(per).sort((a, b) => b[1] - a[1]);
    daily = `<section class="card d1"><b>今日消耗（kcal）</b>${rows.length ? `<div class="stat" style="margin:8px 0 10px;color:var(--c)">${kcalText(totalKcal)}</div>
      <table class="tbl">${rows.map(([id, k]) => `<tr><td>${esc(getEx(id).name)}</td><td>${kcalText(k)}</td></tr>`).join('')}</table>` : `<div class="empty">今天还没有训练</div>`}</section>`;
  } else {
    const days = [];
    for (let i = R - 1; i >= 0; i--) {
      const d = addDays(today0, -i), ds = ymd(d), ss = all.filter(s => s.date === ds), k = ss.reduce((a, s) => a + calc(s).kcal, 0);
      days.push({ label: short(ds), y: Math.round(k), n: ss.length, tip: `${short(ds)}：${k ? kcalText(k) + ' kcal' : '没有训练'}` });
    }
    const list = [...days].reverse().filter(d => d.n);
    daily = `<section class="card d1"><b>每日消耗（kcal）</b><div class="tiny">${rangeName}</div><div style="margin-top:12px">${barChart(days)}</div>
    ${list.length ? `<details class="small" style="margin-top:6px"><summary class="muted">查看数据</summary><table class="tbl" style="margin-top:6px"><tr><th>日期</th><th>kcal</th></tr>${list.map(d => `<tr><td>${d.label}</td><td>${kcalText(d.y)}</td></tr>`).join('')}</table></details>` : ''}</section>`;
  }

  const setsOf = list => { const o = {}; list.forEach(s => s.exercises.forEach(e => { const g = getEx(e.ex).goal, n = e.sets.filter(t => t.done).length; o[g] = (o[g] || 0) + n; })); return o; };
  const cur = setsOf(inRange), prev = setsOf(prevRange);
  const goalRows = Object.entries(GOALS).map(([k, g]) => {
    const ex = getEx(g.key), ser = series(g.key).filter(p => fromYmd(p.date) >= since);
    let trend = g.hint;
    if (ser.length >= 2 && ser[0].y !== ser[ser.length - 1].y) trend = `${ex.name}：${ser[0].y} → ${ser[ser.length - 1].y} ${seriesUnit(ex)}`;
    else if (ser.length) trend = `${ex.name}：${ser[ser.length - 1].y} ${seriesUnit(ex)}`;
    return `<div class="goalrow"><div class="grow"><div class="nm">${g.name}</div><div class="small muted">${esc(trend)}</div></div><div class="sets">${cur[k] || 0} 组<div class="tiny" style="font-weight:400">${prevName} ${prev[k] || 0}</div></div></div>`;
  }).join('');

  const usedIds = [...new Set(all.flatMap(s => s.exercises.map(e => e.ex)))];
  if (!usedIds.includes(ui.exPick)) ui.exPick = usedIds[0];
  const ex = getEx(ui.exPick), full = series(ui.exPick), ser = full.filter(p => fromYmd(p.date) >= since), unit = seriesUnit(ex);
  const serPts = ser.map(p => ({ t: fromYmd(p.date).getTime(), y: p.y, label: short(p.date) }));
  const before = full.filter(p => fromYmd(p.date) < since).pop();
  const exView = ser.length >= 2 ? lineChart(serPts, unit)
    : ser.length ? `<div class="stat">${ser[0].y} ${unit}</div><div class="tiny">${short(ser[0].date)}${before ? ` · 之前一次 ${before.y} ${unit}（${short(before.date)}）` : ''}</div>`
    : `<div class="empty">${rangeName}没有这个动作的记录</div>`;
  return head + `
  <div class="seg d1" style="margin-bottom:14px">${[[1, '当天'], [7, '一周'], [30, '一个月']].map(([v, l]) => `<button class="${R === v ? 'on' : ''}" data-a="range" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="stats" style="margin-bottom:14px">
    <div class="card"><div class="stat">${inRange.length}</div><div class="tiny">次训练</div></div>
    <div class="card"><div class="stat">${totalKcal ? kcalText(totalKcal) : 0}</div><div class="tiny">kcal（估算）</div></div>
    <div class="card"><div class="stat">${totalSets}</div><div class="tiny">完成组数</div></div>
  </div>
  ${daily}
  <section class="card"><b>四个目标部位</b><div class="tiny" style="margin:2px 0 10px">${rangeName}完成的组数，和关键动作的变化</div>${goalRows}</section>
  <section class="card d1"><b>动作进步</b><div style="height:10px"></div>
    <select class="pick" data-change="exPick" aria-label="选择动作">${usedIds.map(id => `<option value="${id}" ${id === ui.exPick ? 'selected' : ''}>${esc(getEx(id).name)}</option>`).join('')}</select>
    ${exView}
    <div class="tiny" style="margin-top:6px">${ex.type === 'assist' ? '辅助重量：越低越强' : ex.type === 'time' ? '每次的最长时间' : ex.type === 'body' ? '每次的最多个数' : '每次的最大重量'}</div>
    ${ser.length >= 2 ? `<details class="small" style="margin-top:6px"><summary class="muted">查看数据</summary><table class="tbl" style="margin-top:6px">${[...ser].reverse().slice(0, 12).map(p => `<tr><td>${short(p.date)}</td><td>${p.y} ${unit}</td></tr>`).join('')}</table></details>` : ''}
  </section>` + bodySec;
}
function series(id) {
  const ex = getEx(id);
  return finished().slice().reverse().map(s => { const e = s.exercises.find(x => x.ex === id); const y = e ? bestValue(ex, e, ex.type === 'assist' ? 1 : 1) : null; return y == null ? null : { date: s.date, y }; }).filter(Boolean);
}
function bodySection() {
  const k = ui.metric, m = BODY_METRICS[k], rows = S.body.filter(b => b[k]).sort((a, b) => a.date.localeCompare(b.date));
  const pts = rows.map(b => ({ t: fromYmd(b.date).getTime(), y: b[k], label: short(b.date) }));
  return `<section class="card d1"><div class="row between"><b>身体数据</b><button class="link small" data-a="bodyAdd">记录</button></div>
    <div style="height:10px"></div>
    <select class="pick" data-change="metricPick" aria-label="选择指标">${Object.entries(BODY_METRICS).map(([id, x]) => `<option value="${id}" ${id === k ? 'selected' : ''}>${x.name}（${x.unit}）</option>`).join('')}</select>
    ${pts.length ? lineChart(pts, m.unit) : `<div class="empty" style="padding:12px">围度比体重更能看出变化。先量一次上臂、腰、臀和大腿，之后每 2–4 周再量。</div>`}
    ${rows.length ? `<table class="tbl" style="margin-top:8px">${[...rows].reverse().slice(0, 6).map(b => `<tr><td>${short(b.date)}</td><td>${b[k]} ${m.unit} <button data-a="bodyDel" data-id="${b.id}" aria-label="删除">×</button></td></tr>`).join('')}</table>` : ''}
  </section>`;
}

/* ---------- 计划 ---------- */
function viewPlan() {
  const day = ui.planDay, D = DAYS[day], est = estimate(day);
  return `<div class="${day}"><div class="h-title" style="margin-bottom:14px">计划</div>
  <div class="seg" style="margin-bottom:14px">${Object.keys(DAYS).map(k => `<button class="${k === day ? 'on' : ''}" data-a="planDay" data-v="${k}">${DAYS[k].label}</button>`).join('')}</div>
  <h2 style="color:var(--c);font-size:26px;font-weight:750;margin:0 2px">${D.title}</h2>
  <p class="small muted" style="margin:0 2px 12px">${S.plan[day].reduce((a, i) => a + i.sets, 0)} 组 · 约 ${est.min} 分钟 · 组间休息 ${S.settings.restSec} 秒</p>
  <section class="card">${S.plan[day].map((it, i) => { const ex = getEx(it.ex); return `<div class="planitem"><button class="pmain" data-a="planItem" data-i="${i}">${thumb(it.ex)}<span class="grow"><span class="nm">${esc(ex.name)}</span><br><span class="t">${fmtTarget(it, ex)}${it.lb !== undefined && it.lb !== '' ? ` · ${it.lb} lb` : ''}</span>${ex.note ? `<span class="pnote">${esc(ex.note)}</span>` : ''}</span></button><button class="px" data-a="planRemove" data-i="${i}" aria-label="移除${esc(ex.name)}">×</button></div>`; }).join('') || '<div class="empty">这一天还没有动作</div>'}</section>
  <button class="btn soft" data-a="addExercise" data-to="plan" style="margin-bottom:6px">加一个动作</button>
  <div style="text-align:center"><button class="link small" style="--c:var(--ink2)" data-a="planReset">恢复原始计划</button></div></div>`;
}

/* ---------- 渲染 ---------- */
function render() {
  if (S.active && !activeSession()) S.active = null;
  const inWorkout = ui.view === 'workout' && activeSession();
  if (ui.view === 'workout' && !inWorkout) ui.view = 'tabs';
  $('#app').innerHTML = inWorkout ? viewWorkout() : { today: viewToday, history: viewHistory, progress: viewProgress, plan: viewPlan }[ui.tab]();
  const nav = $('#nav');
  nav.style.display = inWorkout ? 'none' : '';
  nav.innerHTML = inWorkout ? '' : `<div>${[['today', '今日', 'home'], ['history', '历史', 'cal'], ['progress', '进度', 'chart'], ['plan', '计划', 'list']].map(([k, l, i]) => `<button class="${ui.tab === k ? 'on' : ''}" data-a="nav" data-v="${k}" ${ui.tab === k ? 'aria-current="page"' : ''}>${ICON[i]}${l}</button>`).join('')}</div>`;
}

/* ---------- 事件 ---------- */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  unlockAudio();
  const fn = actions[el.dataset.a]; if (fn) fn(el.dataset, el);
});
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in; if (!k) return;
  const d = el.dataset, v = el.value;
  if (k === 'set') {
    const s = activeSession(), st = s.exercises[d.i].sets[d.j];
    st[d.f] = v === '' ? '' : num(v); el.closest('.fld').classList.remove('bad'); save();
    const c = calc(s), kk = $('#livekcal'); if (kk) kk.textContent = kcalText(c.kcal);
  } else if (k === 'f') {
    ui.f[d.f] = v;
    if (d.f === 'dur') { const c = calc(activeSession(), num(v) * 60), kk = $('#fKcal'); if (kk) kk.textContent = kcalText(c.kcal); }
  } else if (k === 'plan') {
    const it = S.plan[ui.planDay][d.i], n = Math.round(num(v));
    if (d.f === 'lb') { if (v.trim() === '') delete it.lb; else it.lb = num(v); save(); render(); }
    else if (n > 0) { it[d.f] = n; if (d.f === 'low' && it.high < n) it.high = n; if (d.f === 'high' && it.low > n) it.low = n; save(); render(); }
  } else if (k === 'add') { ui.add[d.f] = v; }
  else if (k === 'setting') {
    const n = num(v);
    if (d.f === 'weightLb' && n >= 60 && n <= 400) S.settings.weightLb = n;
    if (d.f === 'restSec' && n >= 15 && n <= 600) S.settings.restSec = Math.round(n);
    save(); render();
  }
});
document.addEventListener('change', ev => {
  const el = ev.target, k = el.dataset.change; if (!k) return;
  if (k === 'exPick') { ui.exPick = el.value; render(); }
  else if (k === 'metricPick') { ui.metric = el.value; render(); }
  else if (k === 'addPick') { ui.add.pickId = el.value; if (el.value) { const ex = getEx(el.value), std = Object.values(S.plan).flat().find(i => i.ex === el.value); if (std) { Object.assign(ui.add, { sets: std.sets, low: std.low, high: std.high }); ui.add.lb = std.lb; } else { ui.add.lb = undefined; if (ex.type === 'time') { ui.add.low = 30; ui.add.high = 45; } } } drawAdd(); }
  else if (k === 'addField') {
    ui.add[el.dataset.f] = el.value;
    if (el.dataset.f === 'type' && el.value === 'time') { ui.add.low = 30; ui.add.high = 45; }
    drawAdd();
  }
  else if (k === 'importFile') importFile(el);
});

/* ---------- 禁止缩放：这是 App，不是网页 ---------- */
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd < 320 && !e.target.closest('input,textarea,select,button,a,summary,label')) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

/* ---------- 后台横幅提醒 ---------- */
let pushCancelled = false;
const b64bytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const pushReady = () => !!(PUSH.url && S.settings.pushOn && S.settings.pushEndpoint);
function pushCall(action, extra) {
  if (!pushReady()) return;
  fetch(`${PUSH.url}/${action}`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: S.settings.pushEndpoint, ...extra }) }).catch(() => {});
}
function pushSchedule() { if (ui.rest) { pushCancelled = false; pushCall('schedule', { delaySec: Math.max(1, Math.round((ui.rest.end - Date.now()) / 1000)) }); } }
function pushCancel() { if (!pushCancelled) { pushCancelled = true; pushCall('cancel'); } }
async function pushEnable() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (/iP(hone|ad|od)/.test(navigator.userAgent) && !standalone) { toast('要从主屏幕的三练图标打开才能开启'); return; }
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) { toast('这台手机的系统版本不支持，iPhone 需要 iOS 16.4 以上'); return; }
  try {
    if (await Notification.requestPermission() !== 'granted') { toast('通知被关闭了，请到手机“设置 → 通知 → 三练”打开'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64bytes(PUSH.key) });
    S.settings.pushEndpoint = sub.endpoint; S.settings.pushOn = true; save(); drawSettings(); toast('已开启，切到别的 App 也会弹横幅');
  } catch (e) { toast('开启失败，请检查网络后再试'); }
}

/* ---------- 启动 ---------- */
if (activeSession() && !activeSession().done) { ui.view = 'workout'; }
else if (S.active) { S.active = null; save(); }
render();
if (!S.settings.onboarded) onboard();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.search.includes('sw'))) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
