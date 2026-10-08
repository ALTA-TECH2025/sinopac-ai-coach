// 永豐 AI 對練 v1.0.4
// 外框與權限模型沿用 CMC 金牌教練：場景中心 → 工作場景（對練記錄／對練／統計）→ 系統設定。
// 對練畫面沿用永豐 v1.0.3 原型；示範場景改為信貸電銷（複訪／議價）與客服話務（銀行／信用卡），複盤維度依應用的評分 schema。
'use strict';

import { SCENARIOS, TRANSCRIPTS, REPORT_CONTENT, OVERALL_DIMS, ANALYTICS } from './data.js?v=20261008.695466f';
import { ROLES, ORG, UNITS, MEMBERS, DEMO_ACCOUNTS, memberById, visibleMemberIds,
         scopeLabel, CAN, AUDIT, SCENARIO_META, SESSIONS } from './org.js?v=20261008.695466f';

const VERSION = 'v1.0.4';
const BUILD = '20261008.695466f';   // 每次發佈更新，側欄顯示，用來確認瀏覽器載到的是哪一版
const AT = [0, 22, 54, 82, 108, 132, 180, 208, 216, 248, 300, 336];

/* ------------------------------------------------------------------ state */
const S = {
  user: null,
  route: { name: 'hub' },
  collapsed: false,
  hubCat: 'all', hubSearch: '',
  personaId: null, difficulty: 'L2',
  reveal: 0, elapsed: 0, confirmEnd: false, timer: null, callPhase: 'ready',   // 對練中：ready 未開始 / live 通話中 / ended 已結束
  recSearch: '', statGran: '月', settingsTab: 'list', memberTab: 'members',
  range: { gran: '月', anchor: '', from: '', to: '' },   // 統計時間區間：日／週／月／季／年／自選／全部，四個報表頁共用
  liveSession: null,
  editScenario: null,   // 場景設定「編輯」中的草稿 { id, draft }
  dlg: null,            // 成員權限頁的對話框 { kind: member|csv|api|org, draft, error, result }
  memberSearch: '',
  paramTab: 'diff',
  auditFilter: { from: '', to: '', who: '全部', mod: '全部', q: '' },
  auditSort: { key: 'at', dir: 'desc' },
  replay: { sessionId: null, time: 0, playing: false, voice: true, timer: null, lastIdx: -1 },
  scoringTimers: {},
};

// 難度集合依應用設定：信貸電銷 L1／L2／L3，客服話務 一般／客訴；每個場景以 diffs 指定可用集合
const DIFF = {
  L1:        { cn: 'L1 配合型', en: 'Cooperative',        col: '#009E96', desc: '客戶態度配合，適合熟悉複訪／議價流程、建立信心。' },
  L2:        { cn: 'L2 標準異議', en: 'Standard Objection', col: '#E0882E', desc: '常見異議、拖延與比價，需要引導與同理。' },
  L3:        { cn: 'L3 高難度', en: 'Demanding',          col: '#D81E26', desc: '情緒化、疑似詐騙質疑、條件強勢談判，全面考驗應變。' },
  normal:    { cn: '一般對話版', en: 'Standard',           col: '#009E96', desc: '一般諮詢，問題單一，回應後接受。' },
  complaint: { cn: '客訴版',    en: 'Complaint',          col: '#D81E26', desc: '一次問很多問題、回應後不滿或衍生其他問題、提及申訴主管機關。' },
};

const scenarioById = id => SCENARIOS.find(s => s.id === id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
/* 通過率目標與分級切分：參數設定 › 通過率目標 可調；場景 > 場景類型 > 全行 逐層覆寫 */
const TARGETS = { passRate: 85, byCat: {}, byScenario: {}, grades: { excellent: 90, good: 80, pass: 70 } };
const scoreCol = v => v >= TARGETS.grades.excellent ? '#1E9E63' : v >= TARGETS.grades.good ? '#2D6CC0' : v >= TARGETS.grades.pass ? '#E0882E' : '#D81E26';
const grade = v => v >= TARGETS.grades.excellent ? '優秀' : v >= TARGETS.grades.good ? '良好' : v >= TARGETS.grades.pass ? '合格' : '待提升';
function targetFor(scId) {
  const sc = SCENARIOS.find(x => x.id === scId);
  if (scId && TARGETS.byScenario[scId] != null) return Number(TARGETS.byScenario[scId]);
  if (sc && TARGETS.byCat[sc.cat] != null) return Number(TARGETS.byCat[sc.cat]);
  return Number(TARGETS.passRate);
}
/* 單場通過判定：依場景評估設定（分數達門檻／達成成交訊號／法遵一票否決）；未評分、逾時一律視為未通過 */
function sessionPass(r) {
  if (!r || r.status !== 'done') return { pass: false, why: r && r.status === 'evaluating' ? '評分中' : '未評分' };
  const ev = ensureEval(r.sc) || { pass: 'score', passScore: 70 };
  if (ev.veto && r.vetoFail) return { pass: false, why: '法遵一票否決' };
  if (ev.pass === 'signal') { const ok = r.signal != null ? !!r.signal : r.score >= ev.passScore; return { pass: ok, why: ok ? '達成成交訊號' : '未達成成交訊號' }; }
  const ok = r.score >= ev.passScore; return { pass: ok, why: `${ok ? '達' : '未達'}門檻 ${ev.passScore} 分` };
}
/* 通過率 = 通過次數 ÷ 全部對練次數（含評分中、未評分） */
function passRate(rows) { const n = rows.length; const k = rows.filter(r => sessionPass(r).pass).length; return { n, k, pct: n ? Math.round(k / n * 100) : null }; }
function passRateText(pr, target) { return pr.pct == null ? '—' : `${pr.pct}%`; }
function passRateSub(pr, target) { return pr.pct == null ? `尚無對練・目標 ${target}%` : `${pr.k}／${pr.n} 次・目標 ${target}%${pr.pct >= target ? '・已達標' : `・差 ${target - pr.pct}%`}`; }
const prCol = (pr, target) => pr.pct == null ? 'var(--muted)' : (pr.pct >= target ? '#1E9E63' : '#D81E26');

/* ------------------------------------------------------------------ 時間區間（對練記錄、對練統計、我的數據、洞察分析共用） */
const RANGE_GRANS = ['日', '週', '月', '季', '年', '自選', '全部'];
const pad2 = n => String(n).padStart(2, '0');
const dKey = d => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
function dParse(k) { const m = String(k || '').slice(0, 10).split(/[\/-]/).map(Number); return (m.length === 3 && m.every(Number.isFinite)) ? new Date(m[0], m[1] - 1, m[2]) : new Date(); }
function rangeAnchor() { if (!S.range.anchor) S.range.anchor = dKey(new Date()); return dParse(S.range.anchor); }
function rangeBounds() {
  const r = S.range; const a = rangeAnchor(); let from, to, label;
  if (r.gran === '日') { from = to = a; label = dKey(a); }
  else if (r.gran === '週') { const dow = (a.getDay() + 6) % 7; from = new Date(a); from.setDate(a.getDate() - dow); to = new Date(from); to.setDate(from.getDate() + 6); label = `${dKey(from)} 當週`; }
  else if (r.gran === '月') { from = new Date(a.getFullYear(), a.getMonth(), 1); to = new Date(a.getFullYear(), a.getMonth() + 1, 0); label = `${a.getFullYear()} 年 ${a.getMonth() + 1} 月`; }
  else if (r.gran === '季') { const q = Math.floor(a.getMonth() / 3); from = new Date(a.getFullYear(), q * 3, 1); to = new Date(a.getFullYear(), q * 3 + 3, 0); label = `${a.getFullYear()} 年 Q${q + 1}`; }
  else if (r.gran === '年') { from = new Date(a.getFullYear(), 0, 1); to = new Date(a.getFullYear(), 11, 31); label = `${a.getFullYear()} 年`; }
  else if (r.gran === '自選') { from = r.from ? dParse(r.from) : null; to = r.to ? dParse(r.to) : null; label = `${from ? dKey(from) : '不限'} – ${to ? dKey(to) : '不限'}`; return { from: from && dKey(from), to: to && dKey(to), label, text: label }; }
  else return { from: null, to: null, label: '全部期間', text: '全部期間' };
  return { from: dKey(from), to: dKey(to), label, text: from.getTime() === to.getTime() ? dKey(from) : `${dKey(from)} – ${dKey(to)}` };
}
function inRange(sess) {
  const b = rangeBounds(); const k = String(sess.date || '').slice(0, 10).replace(/-/g, '/');
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(k)) return true;
  return (!b.from || k >= b.from) && (!b.to || k <= b.to);
}
function rangeShift(dir) {
  const r = S.range; const a = rangeAnchor();
  if (r.gran === '日') a.setDate(a.getDate() + dir); else if (r.gran === '週') a.setDate(a.getDate() + 7 * dir);
  else if (r.gran === '月') a.setMonth(a.getMonth() + dir); else if (r.gran === '季') a.setMonth(a.getMonth() + 3 * dir); else if (r.gran === '年') a.setFullYear(a.getFullYear() + dir);
  r.anchor = dKey(a);
}
function setRangeGran(g) {
  if (!RANGE_GRANS.includes(g)) return; S.range.gran = g;
  if (g === '自選' && !S.range.from && !S.range.to) { const t = new Date(); S.range.from = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-01`; S.range.to = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`; }
}
function viewRangeBar(note) {
  const r = S.range; const b = rangeBounds(); const fixed = ['日', '週', '月', '季', '年'].includes(r.gran);
  const err = r.gran === '自選' && r.from && r.to && dParse(r.from) > dParse(r.to) ? '<span class="range-err">起日不可晚於迄日</span>' : '';
  return `<div class="range-bar">
    <div class="seg">${RANGE_GRANS.map(g => `<button class="${r.gran === g ? 'on' : ''}" data-act="rangegran" data-arg="${g}">${g}</button>`).join('')}</div>
    ${fixed ? `<div class="range-nav"><button class="rng-btn" data-act="rangeprev" aria-label="上一期">${svg(I.left, 15)}</button><b>${esc(b.label)}</b><button class="rng-btn" data-act="rangenext" aria-label="下一期">${svg(I.right, 15)}</button><button class="btn-ghost sm" data-act="rangetoday">回到今天</button></div>` : ''}
    ${r.gran === '自選' ? `<div class="range-custom"><input type="date" data-range="from" value="${esc(r.from)}"><span>至</span><input type="date" data-range="to" value="${esc(r.to)}">${err}</div>` : ''}
    <span class="range-label">${svg(I.clock || I.check, 13)} ${esc(b.text)}${note ? `　·　${esc(note)}` : ''}</span>
  </div>`;
}
/* 得分趨勢：依區間長度自動選日／週／月分桶，取每桶已評分場次平均分 */
function trendSeries(rows) {
  const done = rows.filter(r => r.status === 'done' && /^\d{4}\/\d{2}\/\d{2}/.test(String(r.date || ''))).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!done.length) return [];
  const b = rangeBounds(); const first = dParse(b.from || done[0].date), last = dParse(b.to || done[done.length - 1].date);
  const span = Math.round((last - first) / 86400000);
  const keyOf = d => { if (span <= 1) return null; if (span <= 31) return { k: dKey(d), l: `${d.getMonth() + 1}/${d.getDate()}` }; if (span <= 120) { const w = new Date(d); w.setDate(d.getDate() - (d.getDay() + 6) % 7); return { k: dKey(w), l: `${w.getMonth() + 1}/${w.getDate()} 週` }; } return { k: `${d.getFullYear()}/${pad2(d.getMonth() + 1)}`, l: `${d.getFullYear()}/${pad2(d.getMonth() + 1)}` }; };
  if (span <= 1) return done.map(r => ({ l: String(r.date).slice(11, 16) || String(r.date).slice(5, 10), v: r.score }));
  const buckets = new Map();
  done.forEach(r => { const d = dParse(r.date); const kk = keyOf(d); const bk = buckets.get(kk.k) || { l: kk.l, sum: 0, n: 0 }; bk.sum += r.score; bk.n++; buckets.set(kk.k, bk); });
  return [...buckets.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([, v]) => ({ l: v.l, v: Math.round(v.sum / v.n * 10) / 10 }));
}
function sessionMinutes(r) { if (r.durationSec) return r.durationSec / 60; const m = /(\d+)′(\d+)″/.exec(String(r.dur || '')); return m ? Number(m[1]) + Number(m[2]) / 60 : 0; }
function minutesText(min) { return min >= 60 ? `${(min / 60).toFixed(1)}h` : `${Math.round(min)}m`; }

/* ------------------------------------------------------------------ icons */
const I = {
  menu:  '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  phone: '<path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.57 3.6 1 1 0 01-.25 1l-2.2 2.2z" fill="currentColor"/>',
  hub:   '<path d="M3 3h7.5v7.5H3zM13.5 3H21v7.5h-7.5zM3 13.5h7.5V21H3zM13.5 13.5H21V21h-7.5z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6M20 16v-2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  cog:   '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1L15 3H9l-.3 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4L4.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 001.7 1L9 21h6l.3-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.4z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  people:'<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5 20a7 7 0 0114 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  doc:   '<path d="M8 4h9a2 2 0 012 2v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  clock: '<path d="M12 7v5l3 2M3.5 12a8.5 8.5 0 1017 0 8.5 8.5 0 00-17 0z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  back:  '<path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  search:'<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  bell:  '<path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M10 18a2 2 0 004 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  globe: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.5 12h17M12 3.5c4 4.5 4 12.5 0 17-4-4.5-4-12.5 0-17z" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  moon:  '<path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
  chev:  '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  left:  '<path d="M11 6l-6 6 6 6M19 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  right: '<path d="M13 6l6 6-6 6M5 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  check: '<path d="M5 12l5 5 9-10" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  play:  '<path d="M6.5 5.5l11 6.5-11 6.5z" fill="currentColor"/>',
  warn:  '<path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/>',
};
const svg = (p, size = 18, cls = '') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${p}</svg>`;

/* ------------------------------------------------------------------ routing */
function parseHash() {
  const h = (location.hash || '#/hub').replace(/^#\/?/, '');
  const p = h.split('/').filter(Boolean);
  if (p[0] === 's' && p[1]) return { name: 'scenario', sc: p[1], tab: p[2] || 'records', arg: p[3] };
  if (p[0] === 'sys') return { name: 'sys', tab: p[1] || 'scenarios' };
  if (p[0] === 'me') return { name: 'me' };
  if (p[0] === 'insights') return { name: 'insights' };
  return { name: 'hub' };
}

function go(hash) { location.hash = hash; }

/* ------------------------------------------------------------------ data helpers */
function visibleSessions() {
  const ids = visibleMemberIds(S.user);
  return SESSIONS.filter(s => ids.includes(s.member));
}

function sessionsAll(scenarioId) { return SESSIONS.filter(s => s.sc === scenarioId).length; }
function sessionsFor(scenarioId) {
  return visibleSessions().filter(s => s.sc === scenarioId);
}

function transcriptFor(scId) { return TRANSCRIPTS[scId] || TRANSCRIPTS['credit-revisit']; }
function reportFor(scId) { return REPORT_CONTENT[scId] || REPORT_CONTENT['credit-revisit']; }

function replayLines(scId) {
  return transcriptFor(scId).map((l, i) => ({ at: AT[i] != null ? AT[i] : i * 30, who: l.who, text: l.t }));
}

/* ------------------------------------------------------------------ login gate */
function viewGate() {
  const rows = DEMO_ACCOUNTS.map(id => {
    const m = memberById(id);
    return `<button class="gate-role" data-act="login" data-arg="${m.id}">
      <span class="av" style="background:${m.col}">${esc(m.name[0])}</span>
      <span><span class="nm">${esc(m.name)}</span><span class="em">${esc(m.email)}</span></span>
      <span class="rl">${esc(ROLES[m.role].cn)}</span>
    </button>`;
  }).join('');
  return `<div class="gate">
    <div class="gate-brand">
      <img src="assets/logo.png" alt="永豐銀行">
      <span><b>永豐AI對練</b><span>AI 金牌理專模擬對練</span></span>
    </div>
    <div class="gate-card">
      <h1>選擇身分進入</h1>
      <p>原型以角色決定導覽與資料範圍：系統管理員看全行、單位主管看本人與下屬、理專只看自己。本原型不驗證帳號密碼。</p>
      ${rows}
    </div>
    <div class="gate-note">永豐AI對練 ${VERSION} · PoC　｜　內容為展示用假資料</div>
  </div>`;
}

/* ------------------------------------------------------------------ shell */
function navItem(hash, icon, label, opts = {}) {
  const on = opts.on ? ' on' : '';
  const badge = opts.badge ? `<span class="badge">${esc(opts.badge)}</span>` : '';
  return `<button class="nav-item${on}" data-act="goto" data-arg="${hash}" title="${esc(label)}">
    ${svg(icon, 18, 'ico')}<span class="lbl">${esc(label)}</span>${badge}</button>`;
}

function subItem(hash, label, on) {
  return `<button class="nav-item${on ? ' on' : ''}" data-act="goto" data-arg="${hash}">
    <span class="dot"></span><span class="lbl">${esc(label)}</span></button>`;
}

function viewSidebar() {
  const r = S.route;
  const openSc = r.name === 'scenario' ? r.sc : null;
  const enabled = SCENARIOS.filter(s => SCENARIO_META[s.id] && SCENARIO_META[s.id].status === 'on');

  let work = '';
  for (const s of enabled) {
    const on = openSc === s.id;
    work += navItem(`#/s/${s.id}/records`, I.doc, s.cn, { on: on && false });
    if (on) {
      work = work.slice(0, work.lastIndexOf('<button class="nav-item"')) +
        `<button class="nav-item on" data-act="goto" data-arg="#/s/${s.id}/records">${svg(I.doc, 18, 'ico')}<span class="lbl">${esc(s.cn)}</span></button>`;
      work += `<div class="nav-sub">
        ${subItem(`#/s/${s.id}/records`, '對練記錄', r.tab === 'records' || r.tab === 'report')}
        ${subItem(`#/s/${s.id}/new`, '對練', r.tab === 'new' || r.tab === 'call')}
        ${CAN.stats(S.user) ? subItem(`#/s/${s.id}/stats`, '統計', r.tab === 'stats') : ''}
      </div>`;
    }
  }

  const statsGroup = CAN.stats(S.user)
    ? `<div class="nav-group">數據洞察</div>
       ${navItem('#/me', I.chart, '我的數據', { on: r.name === 'me' })}
       ${navItem('#/insights', I.clock, '洞察分析', { on: r.name === 'insights' })}`
    : `<div class="nav-group">數據洞察</div>${navItem('#/me', I.chart, '我的數據', { on: r.name === 'me' })}`;

  const sysGroup = CAN.settings(S.user)
    ? `<div class="nav-group">系統設定</div>
       ${navItem('#/sys/scenarios', I.cog, '場景設定', { on: r.name === 'sys' && r.tab === 'scenarios' })}
       ${navItem('#/sys/params', I.chart, '參數設定', { on: r.name === 'sys' && r.tab === 'params' })}
       ${navItem('#/sys/members', I.people, '成員權限', { on: r.name === 'sys' && r.tab === 'members', badge: MEMBERS.length })}
       ${navItem('#/sys/audit', I.clock, '操作記錄', { on: r.name === 'sys' && r.tab === 'audit' })}`
    : (CAN.scenarioSettings(S.user)
        ? `<div class="nav-group">系統設定</div>${navItem('#/sys/scenarios', I.cog, '場景設定', { on: r.name === 'sys' && r.tab === 'scenarios' })}${navItem('#/sys/params', I.chart, '參數設定', { on: r.name === 'sys' && r.tab === 'params' })}`
        : '');

  return `<aside class="side">
    <div class="side-brand"><img src="assets/logo.png" alt=""><b>永豐AI對練</b></div>
    <div class="side-scroll">
      ${navItem('#/hub', I.hub, '場景中心', { on: r.name === 'hub' })}
      <div class="nav-group">工作場景</div>
      ${work}
      ${statsGroup}
      ${sysGroup}
    </div>
    <div class="side-foot">
      <div class="side-ver" title="build ${BUILD}">SinoPac AI Coach ${VERSION} · PoC · build ${BUILD}</div>
      <button class="side-collapse" data-act="collapse">
        ${svg(S.collapsed ? I.right : I.left, 17)}<span class="lbl">收合側欄</span>
      </button>
    </div>
  </aside>`;
}

function viewTopbar() {
  const u = S.user;
  return `<div class="topbar">
    <button class="icon-btn nav-btn" data-act="navtoggle" aria-label="選單">${svg(I.menu, 20)}</button>
    <div class="brand-m"><img src="assets/logo.png" alt=""><b>永豐AI對練</b></div>
    <button class="org-pick" data-act="noop">
      <span>永豐商業銀行</span><span class="sep">/</span><span>${esc(UNITS[u.unit] || '總行')}</span>${svg(I.chev, 15)}
    </button>
    <div class="search">
      ${svg(I.search, 15)}
      <input placeholder="搜尋場景、客戶畫像、對練場次" data-act="globalsearch" value="${esc(S.hubSearch)}">
      <kbd>⌘K</kbd>
    </div>
    <div class="top-right">
      <button class="icon-btn" data-act="noop" title="語言">${svg(I.globe, 18)}</button>
      <button class="icon-btn" data-act="noop" title="外觀">${svg(I.moon, 18)}</button>
      <button class="icon-btn" data-act="noop" title="通知">${svg(I.bell, 18)}<span class="dot"></span></button>
      <button class="me" data-act="logout" title="切換身分／登出">
        <span class="av" style="background:${u.col}">${esc(u.name[0])}</span>
        <span><span class="nm">${esc(u.name)}</span><span class="rl">${esc(ROLES[u.role].cn)}</span></span>
      </button>
    </div>
  </div>`;
}

function viewCrumb(parts, opts = {}) {
  const items = parts.map((p, i) => i === parts.length - 1
    ? `<span class="cur">${esc(p.label)}</span>`
    : `<a href="${p.hash}">${esc(p.label)}</a><span>/</span>`).join('');
  const perm = opts.perm ? `<span class="perm">權限 ${esc(ROLES[S.user.role].cn)}</span>` : '';
  const back = opts.back ? `<button class="back" data-act="goto" data-arg="${opts.back}">${svg(I.back, 15)}返回</button>` : '';
  return `<div class="crumb">${items}${perm}${back}</div>`;
}

/* ------------------------------------------------------------------ 場景設定：編輯與本機保存 */
/* ---- 參數設定：場景類型、難度選項、人設選項、評分規則（獨立頁 #/sys/params），場景與客戶畫像表單直接讀取 ---- */
const CATS = {
  credit:  { label: '信貸電銷 · Telesales', short: '信貸電銷', diffs: ['L1', 'L2', 'L3'], role: '電銷專員', schema: 'credit4' },
  service: { label: '客服話務 · Service',   short: '客服話務', diffs: ['normal', 'complaint'], role: '客服專員', schema: 'mocall5' },
};
// 場景類型是難度、學員角色與評分規則的「母集合」：場景只能在類型允許的難度中勾選，Agent 只能在場景勾選的難度中配置
const catDiffs = cat => (CATS[cat] && CATS[cat].diffs.length) ? CATS[cat].diffs.filter(k => DIFF[k]) : Object.keys(DIFF);
const catSchema = cat => (CATS[cat] && SCHEMAS[CATS[cat].schema]) ? CATS[cat].schema : (Object.keys(SCHEMAS)[0] || '');
// 參數設定要調整某類型的難度集合時，先看有哪些場景（含客戶畫像、Agent）還在用被拿掉的難度
function catDiffUsage(cat, removed) {
  return SCENARIOS.filter(s => s.cat === cat).map(s => {
    const used = removed.filter(k => (s.diffs || []).includes(k) || s.personas.some(p => p.diff === k) || (SCENARIO_META[s.id].agents || []).some(g => g.diff === k));
    return used.length ? `${s.cn}（${used.map(k => DIFF[k] ? DIFF[k].cn : k).join('、')}）` : '';
  }).filter(Boolean);
}
const CAT_LABEL = {}; const DIFF_SETS = {};
function syncCatDerived() { Object.keys(CAT_LABEL).forEach(k => delete CAT_LABEL[k]); Object.keys(DIFF_SETS).forEach(k => delete DIFF_SETS[k]); Object.keys(CATS).forEach(k => { CAT_LABEL[k] = CATS[k].label; DIFF_SETS[k] = CATS[k].diffs.slice(); }); }
syncCatDerived();
const PERSONA_OPTS = {
  moods: ['客氣、反覆拖延', '高度懷疑、須家人參與', '理性、逐項比對', '施壓、威脅撤件', '聽不懂術語、需多次說明', '憤怒、咆哮', '焦慮、激動', '謹慎、重複確認'],
  risks: ['受薪階級 · 年收入 80 萬', '自營商 · 中高齡', '已核准 80 萬 · 他行 2.5%', '往來 12 年 · 薪轉戶', '網銀登入 · 高齡', '拒訪登記 · 不配合核身', '刷卡失敗 · 櫃檯前', '年費 · 分期手續費'],
  roles: ['電銷專員', '客服專員', '理財專員', '催收專員', '臨櫃專員'],
};
const SCHEMAS = {
  credit4: { name: 'Agent1 四構面（信貸電銷）', dims: [{ cn: '搜身資訊', en: 'Info Gathering' }, { cn: '銷售堅持', en: 'Persistence' }, { cn: '需求挖掘', en: 'Needs Discovery' }, { cn: '異議處理', en: 'Objection Handling' }], veto: true, desc: '四構面等權重，每構面 5 細項 0–5 分；依人設標記必評／選評／不適用；法遵 14 項一票否決。' },
  mocall5: { name: 'mo call 表五項（客服話務）', dims: [{ cn: '開場與核身', en: 'Opening & ID Check' }, { cn: '問題釐清', en: 'Clarification' }, { cn: '解決方案正確性', en: 'Resolution' }, { cn: '服務態度與同理', en: 'Empathy' }, { cn: '效率', en: 'Efficiency' }], veto: false, desc: '依現行 mo call 表評核；效率以通話時間／保留時間計算。' },
};
const LS_PARAMS = 'sinopac-coach.params';
function persistParams() { lsSet(LS_PARAMS, { diff: DIFF, cats: CATS, personaOpts: PERSONA_OPTS, schemas: SCHEMAS, targets: TARGETS }); }
function loadParams() {
  const p = lsGet(LS_PARAMS); if (!p) return;
  if (p.diff) { Object.keys(DIFF).forEach(k => delete DIFF[k]); Object.assign(DIFF, p.diff); }
  if (p.cats) { Object.keys(CATS).forEach(k => delete CATS[k]); Object.assign(CATS, p.cats); syncCatDerived(); }
  if (p.personaOpts) Object.assign(PERSONA_OPTS, p.personaOpts);
  if (p.schemas) { Object.keys(SCHEMAS).forEach(k => delete SCHEMAS[k]); Object.assign(SCHEMAS, p.schemas); }
  if (p.targets) { Object.assign(TARGETS, p.targets); TARGETS.grades = { ...{ excellent: 90, good: 80, pass: 70 }, ...(p.targets.grades || {}) }; TARGETS.byCat = p.targets.byCat || {}; TARGETS.byScenario = p.targets.byScenario || {}; }
}
function saveTargets() {
  const num = sel => { const el = document.querySelector(sel); if (!el) return null; const v = el.value.trim(); return v === '' ? null : Number(v); };
  const errs = []; const inRange = v => v != null && Number.isFinite(v) && v >= 0 && v <= 100;
  const g = num('[data-target="passRate"]'); if (!inRange(g)) errs.push('全行通過率目標須為 0–100');
  const ge = num('[data-target="g.excellent"]'), gg = num('[data-target="g.good"]'), gp = num('[data-target="g.pass"]');
  if (![ge, gg, gp].every(inRange)) errs.push('分級切分須為 0–100'); else if (!(ge > gg && gg > gp)) errs.push('分級切分須遞減：優秀 > 良好 > 合格');
  const byCat = {}, bySc = {};
  document.querySelectorAll('[data-target^="cat."]').forEach(el => { const v = el.value.trim(); if (v === '') return; const n = Number(v); if (!inRange(n)) errs.push(`場景類型「${CATS[el.dataset.target.slice(4)] ? CATS[el.dataset.target.slice(4)].short : el.dataset.target}」目標須為 0–100`); else byCat[el.dataset.target.slice(4)] = n; });
  document.querySelectorAll('[data-target^="sc."]').forEach(el => { const v = el.value.trim(); if (v === '') return; const n = Number(v); const sc = scenarioById(el.dataset.target.slice(3)); if (!inRange(n)) errs.push(`場景「${sc ? sc.cn : el.dataset.target}」目標須為 0–100`); else bySc[el.dataset.target.slice(3)] = n; });
  if (errs.length) { S.targetMsg = { err: errs.join('；') }; render(); return; }
  TARGETS.passRate = g; TARGETS.grades = { excellent: ge, good: gg, pass: gp }; TARGETS.byCat = byCat; TARGETS.byScenario = bySc;
  persistParams(); audit('更新通過率目標', `全行 ${g}%・類型覆寫 ${Object.keys(byCat).length}・場景覆寫 ${Object.keys(bySc).length}・分級 ${ge}/${gg}/${gp}`, '參數設定');
  S.targetMsg = { ok: '已儲存，所有通過率卡片與分級即時套用。' }; render();
}
/* 評估 Agent（評分 workflow）依場景配置 */
function ensureEval(id) {
  const sc = scenarioById(id); const meta = SCENARIO_META[id]; if (!sc || !meta) return null;
  if (!meta.eval) {
    const credit = sc.cat === 'credit';
    meta.eval = { name: credit ? 'altabots · 信貸評估 Agent（Agent1 評分）' : 'altabots · 客服評估 Agent（mo call 表）', schema: catSchema(sc.cat),
      workflow: credit ? 'wf_credit_eval' : 'wf_service_eval', timeoutSec: 60, pass: credit ? 'signal' : 'score', passScore: 70, veto: credit };
  }
  return meta.eval;
}
function diffInUse(code) {
  return SCENARIOS.some(s => (s.diffs || []).includes(code) || s.personas.some(p => p.diff === code) || (SCENARIO_META[s.id].agents || []).some(g => g.diff === code)) || SESSIONS.some(x => x.diff === code);
}
function openParam(kind, code) {
  if (kind === 'diff') { const d = code ? DIFF[code] : null; openDlg('diff', d ? { code, cn: d.cn, en: d.en, col: d.col, desc: d.desc } : { code: '', cn: '', en: '', col: '#2D6CC0', desc: '' }); }
  else if (kind === 'cat') { const d = code ? CATS[code] : null; openDlg('cat', d ? { code, short: d.short, label: d.label, diffs: d.diffs.join(','), role: d.role, schema: catSchema(code) } : { code: '', short: '', label: '', diffs: Object.keys(DIFF).slice(0, 3).join(','), role: PERSONA_OPTS.roles[0] || '', schema: Object.keys(SCHEMAS)[0] || '' }); }
  else if (kind === 'schema') { const d = code ? SCHEMAS[code] : null; openDlg('schema', d ? { code, name: d.name, dimsText: d.dims.map(x => x.cn + (x.en ? ' / ' + x.en : '')).join('\n'), veto: !!d.veto, desc: d.desc || '' } : { code: '', name: '', dimsText: '', veto: false, desc: '' }); }
}
function saveParam() {
  const g = S.dlg; const d = g.draft; const errs = [];
  const codeOk = v => /^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(v);
  if (g.kind === 'diff') {
    const code = d.code || (d.newCode || '').trim();
    if (!d.cn.trim()) errs.push('名稱必填'); if (!d.code && !codeOk(code)) errs.push('代碼須為英文開頭的英數字'); if (!d.code && DIFF[code]) errs.push('代碼已存在');
    if (!/^#[0-9A-Fa-f]{6}$/.test(d.col.trim())) errs.push('顏色須為 #RRGGBB');
    if (errs.length) { g.error = errs.join('；'); render(); return; }
    DIFF[code] = { cn: d.cn.trim(), en: d.en.trim(), col: d.col.trim(), desc: d.desc.trim() }; audit(d.code ? '編輯難度' : '新增難度', `${DIFF[code].cn}（${code}）`, '參數設定');
  } else if (g.kind === 'cat') {
    const code = d.code || (d.newCode || '').trim();
    if (!d.short.trim()) errs.push('名稱必填'); if (!d.code && !codeOk(code)) errs.push('代碼須為英文開頭的英數字'); if (!d.code && CATS[code]) errs.push('代碼已存在');
    const diffs = d.diffs.split(',').map(x => x.trim()).filter(k => DIFF[k]); if (!diffs.length) errs.push('至少勾選一個難度');
    if (d.code && CATS[code]) {
      const removed = CATS[code].diffs.filter(k => !diffs.includes(k)); const usage = catDiffUsage(code, removed);
      if (usage.length) errs.push(`以下場景仍在使用被取消的難度，請先到場景設定調整：${usage.join('；')}`);
    }
    if (errs.length) { g.error = errs.join('；'); render(); return; }
    CATS[code] = { short: d.short.trim(), label: d.label.trim() || d.short.trim(), diffs, role: d.role.trim(), schema: SCHEMAS[d.schema] ? d.schema : (Object.keys(SCHEMAS)[0] || '') }; syncCatDerived();
    SCENARIOS.forEach(s => { if (s.cat === code) s.catCn = CATS[code].label; });
    audit(d.code ? '編輯場景類型' : '新增場景類型', `${CATS[code].short}（${code}）`, '參數設定');
  } else if (g.kind === 'schema') {
    const code = d.code || (d.newCode || '').trim();
    if (!d.name.trim()) errs.push('名稱必填'); if (!d.code && !codeOk(code)) errs.push('代碼須為英文開頭的英數字'); if (!d.code && SCHEMAS[code]) errs.push('代碼已存在');
    const dims = d.dimsText.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [cn, en] = l.split('/').map(x => x.trim()); return { cn, en: en || '' }; });
    if (dims.length < 2) errs.push('至少兩個評分維度（每行一個，可用「中文 / English」）');
    if (errs.length) { g.error = errs.join('；'); render(); return; }
    SCHEMAS[code] = { name: d.name.trim(), dims, veto: !!d.veto, desc: d.desc.trim() }; audit(d.code ? '編輯評分規則' : '新增評分規則', `${SCHEMAS[code].name}（${code}）・${dims.length} 維`, '參數設定');
  }
  persistParams(); S.dlg = null; render();
}
function deleteParam(kind, code) {
  if (kind === 'diff') { if (diffInUse(code)) { alert('此難度仍被場景、客戶畫像、Agent 或對練場次使用，無法刪除'); return; } if (!confirm(`刪除難度「${DIFF[code].cn}」？`)) return; audit('刪除難度', `${DIFF[code].cn}（${code}）`, '參數設定'); delete DIFF[code]; Object.keys(CATS).forEach(k => { CATS[k].diffs = CATS[k].diffs.filter(x => x !== code); }); syncCatDerived(); }
  else if (kind === 'cat') { if (SCENARIOS.some(s => s.cat === code)) { alert('仍有場景使用此類型，無法刪除'); return; } if (!confirm(`刪除場景類型「${CATS[code].short}」？`)) return; audit('刪除場景類型', `${CATS[code].short}（${code}）`, '參數設定'); delete CATS[code]; syncCatDerived(); }
  else if (kind === 'schema') { if (SCENARIOS.some(s => (SCENARIO_META[s.id].eval || {}).schema === code)) { alert('仍有場景的評估 Agent 使用此評分規則，無法刪除'); return; } if (Object.values(CATS).some(c => c.schema === code)) { alert('仍有場景類型以此為預設評分規則，請先到「場景類型」改選其他規則'); return; } if (!confirm(`刪除評分規則「${SCHEMAS[code].name}」？`)) return; audit('刪除評分規則', `${SCHEMAS[code].name}（${code}）`, '參數設定'); delete SCHEMAS[code]; }
  persistParams(); render();
}
function personaOptAdd(group) { const inp = document.getElementById('popt-' + group); const v = inp ? inp.value.trim() : ''; if (!v) return; if (!PERSONA_OPTS[group].includes(v)) PERSONA_OPTS[group].push(v); persistParams(); audit('新增人設選項', `${{ moods: '情緒狀態', risks: '屬性標籤', roles: '學員角色' }[group]}：${v}`, '參數設定'); render(); }
function personaOptDel(arg) { const [group, idx] = arg.split(':'); const v = PERSONA_OPTS[group][Number(idx)]; PERSONA_OPTS[group].splice(Number(idx), 1); persistParams(); audit('刪除人設選項', `${{ moods: '情緒狀態', risks: '屬性標籤', roles: '學員角色' }[group]}：${v}`, '參數設定'); render(); }

function viewSysParams() {
  const tab = S.paramTab || 'diff';
  const tabs = [['diff', '難度選項'], ['cat', '場景類型'], ['persona', '人設選項'], ['schema', '評分規則'], ['target', '通過率目標']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="paramtab" data-arg="${k}">${l}</button>`).join('');
  let body = '';
  if (tab === 'diff') {
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">這裡維護全行可用的難度選項；每個場景類型再從中挑選自己的難度集合（如信貸電銷 L1–L3、客服話務 一般／客訴），場景與 Agent 只能用所屬類型的難度。</div><div style="margin-left:auto"><button class="btn-primary" data-act="paramopen" data-arg="diff:">＋ 新增難度</button></div></div>
      <div class="card"><table class="tbl"><thead><tr><th>代碼</th><th>名稱</th><th>英文</th><th>顏色</th><th>說明</th><th>使用中</th><th class="num">操作</th></tr></thead><tbody>
      ${Object.keys(DIFF).map(k => { const d = DIFF[k]; const used = diffInUse(k); return `<tr><td class="mono">${esc(k)}</td><td><span class="pill" style="color:${d.col};background:${d.col}1f">${esc(d.cn)}</span></td><td style="color:var(--muted)">${esc(d.en || '')}</td><td><span class="swatch" style="background:${d.col}"></span><span class="mono" style="font-size:11.5px">${esc(d.col)}</span></td><td style="font-size:12.5px;color:var(--body)">${esc(d.desc || '')}</td><td>${used ? '<span class="pill info">使用中</span>' : '<span class="pill" style="color:var(--faint);background:var(--soft)">未使用</span>'}</td>
        <td class="num" style="white-space:nowrap"><button class="btn-ghost sm" data-act="paramopen" data-arg="diff:${k}">編輯</button> <button class="btn-ghost sm danger" data-act="paramdel" data-arg="diff:${k}" ${used ? 'disabled' : ''}>刪除</button></td></tr>`; }).join('')}
      </tbody></table></div>`;
  } else if (tab === 'cat') {
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">場景類型是場景設定的母集合：決定場景中心的分類頁籤、該類型場景「可用」的難度集合、預設學員角色與預設評分規則；場景只能在其中勾選，Agent 只能配置場景已勾選的難度。</div><div style="margin-left:auto"><button class="btn-primary" data-act="paramopen" data-arg="cat:">＋ 新增類型</button></div></div>
      <div class="card"><table class="tbl"><thead><tr><th>代碼</th><th>名稱</th><th>完整標籤</th><th>可用難度集合</th><th>預設學員角色</th><th>預設評分規則</th><th>場景數</th><th class="num">操作</th></tr></thead><tbody>
      ${Object.keys(CATS).map(k => { const d = CATS[k]; const n = SCENARIOS.filter(s => s.cat === k).length; return `<tr><td class="mono">${esc(k)}</td><td><b>${esc(d.short)}</b></td><td style="color:var(--muted)">${esc(d.label)}</td><td>${d.diffs.map(x => DIFF[x] ? `<span class="pill" style="color:${DIFF[x].col};background:${DIFF[x].col}1f;margin-right:4px">${esc(DIFF[x].cn)}</span>` : '').join('')}</td><td>${esc(d.role)}</td><td style="font-size:12.5px">${SCHEMAS[catSchema(k)] ? esc(SCHEMAS[catSchema(k)].name) : '—'}</td><td class="mono">${n}</td>
        <td class="num" style="white-space:nowrap"><button class="btn-ghost sm" data-act="paramopen" data-arg="cat:${k}">編輯</button> <button class="btn-ghost sm danger" data-act="paramdel" data-arg="cat:${k}" ${n ? 'disabled' : ''}>刪除</button></td></tr>`; }).join('')}
      </tbody></table></div>`;
  } else if (tab === 'persona') {
    const grp = (key, title, hint) => `<div class="card" style="padding:16px 18px;margin-bottom:12px"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px"><b>${title}</b><small style="color:var(--muted)">${hint}</small></div>
      <div class="chks" style="margin-bottom:10px">${PERSONA_OPTS[key].map((v, i) => `<span class="pill opt">${esc(v)}<button data-act="poptdel" data-arg="${key}:${i}" aria-label="移除">×</button></span>`).join('') || '<span style="color:var(--faint);font-size:12.5px">尚無選項</span>'}</div>
      <div style="display:flex;gap:8px"><input id="popt-${key}" class="inp-sm" placeholder="輸入新選項後按新增"><button class="btn-ghost sm" data-act="poptadd" data-arg="${key}">新增</button></div></div>`;
    body = grp('moods', '情緒狀態', '客戶畫像表單的「情緒狀態」建議選項') + grp('risks', '屬性標籤', '客戶畫像表單的「屬性標籤」建議選項') + grp('roles', '學員角色', '場景「你的角色」與場景類型預設角色的選項');
  } else if (tab === 'target') {
    const msg = S.targetMsg || {}; const g = TARGETS.grades;
    const numIn = (key, val, ph) => `<input type="number" min="0" max="100" class="inp-sm" style="width:92px" data-target="${key}" value="${val == null ? '' : esc(String(val))}" placeholder="${esc(ph || '')}">`;
    const catRows = Object.keys(CATS).map(k => `<tr><td><b>${esc(CATS[k].short)}</b> <span class="mono" style="font-size:11px;color:var(--faint)">${esc(k)}</span></td><td class="mono">${esc(String(TARGETS.passRate))}%</td><td>${numIn('cat.' + k, TARGETS.byCat[k], '沿用全行')}</td><td class="mono">${SCENARIOS.filter(s => s.cat === k).length}</td></tr>`).join('');
    const scRows = SCENARIOS.map(s => { const inherit = TARGETS.byCat[s.cat] != null ? TARGETS.byCat[s.cat] : TARGETS.passRate; const ev = ensureEval(s.id); return `<tr><td><b>${esc(s.cn)}</b> <span style="color:var(--muted);font-size:12px">${esc(CATS[s.cat] ? CATS[s.cat].short : s.cat)}</span></td><td style="font-size:12px;color:var(--body)">${ev.pass === 'score' ? `分數 ≥ ${ev.passScore}` : '達成成交訊號'}${ev.veto ? '・法遵否決' : ''}</td><td class="mono">${esc(String(inherit))}%</td><td>${numIn('sc.' + s.id, TARGETS.byScenario[s.id], '沿用類型')}</td><td class="mono">${(() => { const pr = passRate(SESSIONS.filter(x => x.sc === s.id)); return pr.pct == null ? '—' : `${pr.pct}%（${pr.k}／${pr.n}）`; })()}</td></tr>`; }).join('');
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">通過率 = 通過次數 ÷ 全部對練次數（含評分中與未評分）；單場是否通過依該場景評估 Agent 的「通關判定」。目標值依 場景 › 場景類型 › 全行 逐層覆寫，空白即沿用上一層。</div><div style="margin-left:auto"><button class="btn-primary" data-act="targetsave">儲存</button></div></div>
      ${msg.err ? `<div class="form-err" style="margin-bottom:12px">${esc(msg.err)}</div>` : ''}${msg.ok ? `<div class="form-ok" style="margin-bottom:12px">${esc(msg.ok)}</div>` : ''}
      <div class="grid2" style="margin-bottom:14px;align-items:start">
        <div class="card" style="padding:16px 18px"><b>全行通過率目標</b><small style="display:block;color:var(--muted);margin:4px 0 10px">我的數據、洞察分析與未覆寫的場景類型／場景使用此值</small><div style="display:flex;align-items:center;gap:8px">${numIn('passRate', TARGETS.passRate)}<span>%</span></div></div>
        <div class="card" style="padding:16px 18px"><b>得分分級切分</b><small style="display:block;color:var(--muted);margin:4px 0 10px">複盤報告、對練記錄與洞察分析的分級標籤；低於「合格」為待提升</small>
          <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><label style="display:flex;gap:6px;align-items:center;font-size:12.5px">優秀 ≥ ${numIn('g.excellent', g.excellent)}</label><label style="display:flex;gap:6px;align-items:center;font-size:12.5px">良好 ≥ ${numIn('g.good', g.good)}</label><label style="display:flex;gap:6px;align-items:center;font-size:12.5px">合格 ≥ ${numIn('g.pass', g.pass)}</label></div></div>
      </div>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h2>依場景類型覆寫</h2><div class="sub">空白沿用全行</div></div><table class="tbl" style="margin-top:10px"><thead><tr><th>場景類型</th><th>沿用值</th><th>覆寫目標（%）</th><th>場景數</th></tr></thead><tbody>${catRows}</tbody></table></div>
      <div class="card"><div class="card-h"><h2>依場景覆寫</h2><div class="sub">空白沿用場景類型；通關判定在場景設定 › 編輯 › 評估 Agent</div></div><table class="tbl" style="margin-top:10px"><thead><tr><th>場景</th><th>單場通關判定</th><th>沿用值</th><th>覆寫目標（%）</th><th>目前通過率（全部記錄）</th></tr></thead><tbody>${scRows}</tbody></table></div>`;
  } else {
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">評分規則定義複盤報告的能力維度；場景的評估 Agent 從這裡選用。</div><div style="margin-left:auto"><button class="btn-primary" data-act="paramopen" data-arg="schema:">＋ 新增評分規則</button></div></div>
      ${Object.keys(SCHEMAS).map(k => { const s = SCHEMAS[k]; const n = SCENARIOS.filter(x => (SCENARIO_META[x.id].eval || {}).schema === k).length; return `<div class="card" style="padding:16px 18px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><b>${esc(s.name)}</b><span class="mono" style="font-size:11px;color:var(--faint)">${esc(k)}</span>${s.veto ? '<span class="pill bad">法遵一票否決</span>' : ''}<span class="pill info">${n} 個場景使用</span>
        <span style="margin-left:auto;white-space:nowrap"><button class="btn-ghost sm" data-act="paramopen" data-arg="schema:${k}">編輯</button> <button class="btn-ghost sm danger" data-act="paramdel" data-arg="schema:${k}" ${n ? 'disabled' : ''}>刪除</button></span></div>
        <div class="chks" style="margin-bottom:8px">${s.dims.map((d, i) => `<span class="pill" style="color:var(--blue);background:#EDF3FB">${i + 1}. ${esc(d.cn)}${d.en ? ` <small style="opacity:.7">${esc(d.en)}</small>` : ''}</span>`).join('')}</div>
        <div style="font-size:12.5px;color:var(--body)">${esc(s.desc || '')}</div></div>`; }).join('')}`;
  }
  return `<div class="wrap"><div class="page-h"><h1>參數設定</h1><p>難度選項、場景類型、人設選項、評分規則與通過率目標；場景、客戶畫像與各報表直接讀取這裡的設定。</p></div><div class="tabs">${tabs}</div>${body}</div>${viewDlg()}`;
}

const OVERRIDE_KEY = 'sinopac-coach.scenarioOverrides';

function loadScenarioOverrides() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}'); } catch (e) { saved = {}; }
  Object.entries(saved).forEach(([id, o]) => {
    const sc = SCENARIOS.find(s => s.id === id); const meta = SCENARIO_META[id];
    if (!sc || !meta || !o) return;
    Object.assign(sc, o.scenario || {});
    if (o.scenario && o.scenario.youRoleCn) sc.youRole = { ...sc.youRole, cn: o.scenario.youRoleCn };
    Object.assign(meta, o.meta || {});
  });
}
function saveScenarioOverride(id, scenarioPatch, metaPatch) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}'); } catch (e) { saved = {}; }
  const prev = saved[id] || { scenario: {}, meta: {} };
  saved[id] = { scenario: { ...prev.scenario, ...scenarioPatch }, meta: { ...prev.meta, ...metaPatch } };
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(saved)); } catch (e) { /* 私密視窗等情況忽略 */ }
}
/* 每個場景底下依「客戶畫像 × 難度」配置多組對練 Agent；舊資料（單一 agent/embed）自動轉成每個畫像一組 */
const LS_CUSTOM_SCN = 'sinopac-coach.customScenarios';
const SCN_ICON = { credit: 'card', service: 'chat' };
const SCN_TINT = { credit: { tint: '#E4ECF7', c1: '#5C95D6', c2: '#2D6CC0' }, service: { tint: '#FFF4E8', c1: '#F0A34A', c2: '#E0882E' } };
function iconSvgFor(cat) { const base = SCENARIOS.find(s => s.cat === cat) || SCENARIOS[0]; return base ? base.icon : ''; }
function ensureAgents(id) {
  const sc = scenarioById(id); const meta = SCENARIO_META[id]; if (!sc || !meta) return [];
  if (!Array.isArray(meta.agents)) {
    // 示範資料：每個客戶畫像依其預設難度各配一組 Agent，iframe 以 altabots 擴展應用的嵌入網址示意
    meta.agents = sc.personas.map((p, i) => ({ id: 'ag-' + id + '-' + i, personaId: p.id, diff: p.diff,
      name: `${meta.agent || 'altabots · 對練 Agent'} · ${DIFF[p.diff] ? DIFF[p.diff].cn : p.diff}`,
      embed: (i === 0 && meta.embed) ? meta.embed : `<iframe src="https://agent.sinopac.ai/altabots/app/${id}/${p.id}-${p.diff}/embed" allow="microphone; autoplay"></iframe>`,
      status: meta.status === 'on' ? 'on' : 'off' }));
  }
  return meta.agents;
}
function agentFor(scId, personaId, diff) {
  const list = ensureAgents(scId);
  return list.find(x => x.personaId === personaId && x.diff === diff) || null;
}
function loadCustomScenarios() {
  const saved = lsGet(LS_CUSTOM_SCN); if (!Array.isArray(saved)) return;
  saved.forEach(({ scenario, meta }) => { if (scenario && meta && !SCENARIOS.some(s => s.id === scenario.id)) { scenario.icon = iconSvgFor(scenario.cat); SCENARIOS.push(scenario); SCENARIO_META[scenario.id] = meta; } });
}
function persistCustomScenarios() {
  const list = SCENARIOS.filter(s => s.custom).map(s => ({ scenario: { ...s, icon: undefined }, meta: SCENARIO_META[s.id] }));
  lsSet(LS_CUSTOM_SCN, list);
}
const LS_DELETED_SCN = 'sinopac-coach.deletedScenarios';
function openDeleteScenario(id) {
  const sc = scenarioById(id); const meta = SCENARIO_META[id]; if (!sc) return;
  const sessions = SESSIONS.filter(s => s.sc === id).length;
  openDlg('scndel', { id, name: sc.cn, enabled: meta.status === 'on', sessions, personas: sc.personas.length, agents: ensureAgents(id).length, confirmName: '' });
}
function confirmDeleteScenario() {
  const g = S.dlg; const d = g.draft; const sc = scenarioById(d.id); if (!sc) { S.dlg = null; render(); return; }
  if (d.enabled) { g.error = '場景仍為「已啟用」，請先在編輯中改為未啟用再刪除'; render(); return; }
  if (d.sessions) { g.error = `此場景已有 ${d.sessions} 筆對練記錄，為保留歷史資料不可刪除，請改為停用`; render(); return; }
  if ((d.confirmName || '').trim() !== sc.cn) { g.error = '請輸入完整的場景名稱以確認刪除'; render(); return; }
  const idx = SCENARIOS.findIndex(s => s.id === d.id); if (idx >= 0) SCENARIOS.splice(idx, 1); delete SCENARIO_META[d.id];
  if (sc.custom) persistCustomScenarios(); else { const del = lsGet(LS_DELETED_SCN) || []; if (!del.includes(d.id)) del.push(d.id); lsSet(LS_DELETED_SCN, del); }
  audit('刪除場景', `${sc.cn}（${d.id}）・客戶畫像 ${d.personas} 個、Agent ${d.agents} 組`, '場景設定');
  S.dlg = null; if (S.route.name === 'scenario' && S.route.sc === d.id) { go('#/hub'); return; } render();
}
function applyDeletedScenarios() { const del = lsGet(LS_DELETED_SCN) || []; del.forEach(id => { const i = SCENARIOS.findIndex(s => s.id === id); if (i >= 0) SCENARIOS.splice(i, 1); delete SCENARIO_META[id]; }); }
function personaInit(name) { const t = String(name || '').split('·').pop().trim(); return t ? t[0] : '客'; }

function openEditScenario(id, addAgent) {
  const cat0 = Object.keys(CATS)[0] || 'credit';
  if (!id) {
    S.editScenario = { id: null, draft: {
      cn: '', en: '', desc: '', cat: cat0, youRoleCn: (CATS[cat0] || {}).role || '', duration: '3–8′', diffs: catDiffs(cat0).join(','),
      ver: 'v1.0', owner: S.user ? S.user.name : '', status: 'off', personas: [], agents: [],
      eval: { name: '', schema: catSchema(cat0), workflow: '', timeoutSec: 60, pass: 'signal', passScore: 70, veto: !!(SCHEMAS[catSchema(cat0)] || {}).veto },
    } };
    render(); return;
  }
  const sc = scenarioById(id); const meta = SCENARIO_META[id];
  if (!sc || !meta) return;
  S.editScenario = { id, draft: {
    cn: sc.cn, en: sc.en, desc: sc.desc, cat: sc.cat, youRoleCn: sc.youRole.cn, duration: sc.duration,
    diffs: (sc.diffs || catDiffs(sc.cat)).filter(k => catDiffs(sc.cat).includes(k)).join(','),
    ver: meta.ver, owner: meta.owner, status: meta.status,
    personas: sc.personas.map(p => ({ ...p })),
    agents: ensureAgents(id).map(x => ({ ...x })),
    eval: { ...ensureEval(id) },
  } };
  if (addAgent) agentAdd(false);
  render();
}
/* 聯動：切換場景類型 → 難度集合重設為該類型的可用集合，角色與評分規則若仍是舊類型預設值就跟著換，畫像／Agent 超出集合的難度重設並提示 */
function applyCatToDraft(e, cat) {
  const d = e.draft; const prev = CATS[d.cat] || {}; const next = CATS[cat] || {}; const set = catDiffs(cat);
  d.cat = cat; d.diffs = set.join(',');
  let np = 0, na = 0;
  d.personas.forEach(p => { if (!set.includes(p.diff)) { p.diff = set[0]; np++; } });
  d.agents.forEach(g => { if (!set.includes(g.diff)) { g.diff = set[0]; na++; } });
  if (!d.youRoleCn.trim() || d.youRoleCn.trim() === (prev.role || '')) d.youRoleCn = next.role || d.youRoleCn;
  if (!SCHEMAS[d.eval.schema] || d.eval.schema === catSchema(Object.keys(CATS).find(k => CATS[k] === prev))) { d.eval.schema = catSchema(cat); d.eval.veto = !!(SCHEMAS[d.eval.schema] || {}).veto; }
  const parts = [`難度集合改為 ${set.map(k => DIFF[k].cn).join('、')}`];
  if (np || na) parts.push(`${np ? `${np} 個客戶畫像` : ''}${np && na ? '、' : ''}${na ? `${na} 組 Agent` : ''}原本的難度不在此類型內，已改為「${DIFF[set[0]].cn}」，請確認`);
  e.error = null; e.notice = `已切換為「${next.short || cat}」：${parts.join('；')}。`;
}
function toggleDraftDiff(e, code, on) {
  const d = e.draft; const list = d.diffs.split(',').filter(Boolean); const set = catDiffs(d.cat);
  if (on) { if (!set.includes(code)) { e.error = `「${DIFF[code] ? DIFF[code].cn : code}」不屬於場景類型「${(CATS[d.cat] || {}).short || d.cat}」的可用難度，請到參數設定調整類型`; return; } if (!list.includes(code)) list.push(code); }
  else {
    const np = d.personas.filter(p => p.diff === code).length, na = d.agents.filter(g => g.diff === code).length;
    if (np || na) { e.error = `「${DIFF[code].cn}」仍有 ${np ? `${np} 個客戶畫像` : ''}${np && na ? '、' : ''}${na ? `${na} 組 Agent` : ''}使用，請先調整它們的難度再取消`; return; }
    if (list.length <= 1) { e.error = '至少要保留一個難度'; return; }
    const i = list.indexOf(code); if (i >= 0) list.splice(i, 1);
  }
  d.diffs = set.filter(k => list.includes(k)).join(','); e.error = null; e.notice = null;
}
function embedSrc(code) { const m = /src\s*=\s*["']([^"']+)["']/i.exec(code || ''); return m ? m[1] : ''; }
function saveEditScenario() {
  const e = S.editScenario; if (!e) return;
  const d = e.draft; const errors = [];
  if (!d.cn.trim()) errors.push('場景名稱必填');
  if (!d.personas.length) errors.push('至少要有一個客戶畫像');
  const allowed = catDiffs(d.cat); const chosen = d.diffs.split(',').filter(Boolean);
  if (!CATS[d.cat]) errors.push('場景類型不存在，請先到參數設定建立');
  if (!chosen.length) errors.push('至少勾選一個難度');
  chosen.filter(k => !allowed.includes(k)).forEach(k => errors.push(`難度「${DIFF[k] ? DIFF[k].cn : k}」不屬於場景類型「${(CATS[d.cat] || {}).short || d.cat}」的可用集合`));
  d.personas.forEach((p, i) => { if (!String(p.name || '').trim()) errors.push(`第 ${i + 1} 個客戶畫像缺名稱`); if (!chosen.includes(p.diff)) errors.push(`第 ${i + 1} 個客戶畫像的預設難度「${DIFF[p.diff] ? DIFF[p.diff].cn : p.diff}」不在此場景的難度集合內`); });
  const seen = new Set();
  d.agents.forEach((g, i) => {
    const key = g.personaId + '|' + g.diff;
    if (seen.has(key)) errors.push(`第 ${i + 1} 組 Agent 的客戶畫像與難度重複`); seen.add(key);
    if (!d.personas.some(p => p.id === g.personaId)) errors.push(`第 ${i + 1} 組 Agent 指到的客戶畫像已不存在`);
    if (!chosen.includes(g.diff)) errors.push(`第 ${i + 1} 組 Agent 的難度「${DIFF[g.diff] ? DIFF[g.diff].cn : g.diff}」不在此場景的難度集合內`);
    if (g.embed.trim() && !/^https:\/\//i.test(embedSrc(g.embed))) errors.push(`第 ${i + 1} 組 Agent 的 iframe 須含 https:// 開頭的 src`);
    if (g.status === 'on' && !g.embed.trim()) errors.push(`第 ${i + 1} 組 Agent 已啟用但尚未貼入 iframe`);
    if (g.agentRef) { const a = agentById(g.agentRef); if (!a) errors.push(`第 ${i + 1} 組 Agent 對應的 AltaBots App 已不存在，請重新選擇`); else if (g.status === 'on' && a.status !== 'on') errors.push(`第 ${i + 1} 組 Agent「${a.name}」在對應清單為停用，不能啟用`); else if (g.status === 'on' && !(a.roles || []).length) errors.push(`第 ${i + 1} 組 Agent「${a.name}」沒有任何可用角色`); }
  });
  if (d.eval.agentRef) { const a = agentById(d.eval.agentRef); if (!a) errors.push('評估 Agent 對應的 AltaBots App 已不存在，請重新選擇'); else if (a.status !== 'on') errors.push(`評估 Agent「${a.name}」在對應清單為停用`); }
  if (errors.length) { e.error = errors.join('；'); render(); return; }
  const diffs = d.diffs.split(',').map(x => x.trim()).filter(k => DIFF[k]);
  const personas = d.personas.map((p, i) => ({ id: p.id, name: p.name.trim(), en: p.en || '', init: personaInit(p.name), col: p.col || PALETTE[i % PALETTE.length], risk: (p.risk || '').trim(), mood: (p.mood || '').trim(), temper: (p.temper || '').trim(), diff: diffs.includes(p.diff) ? p.diff : diffs[0] }));
  const agents = d.agents.map(g => ({ ...g, name: g.name.trim(), embed: g.embed.trim() }));
  const first = agents.find(g => g.status === 'on') || agents[0];
  const scenarioPatch = { cn: d.cn.trim(), en: d.en.trim(), desc: d.desc.trim(), cat: d.cat, catCn: CAT_LABEL[d.cat] || '', duration: d.duration.trim(),
    diffs: diffs.length ? diffs : catDiffs(d.cat), youRoleCn: d.youRoleCn.trim(), personas };
  const ev = { name: String(d.eval.name || '').trim(), agentRef: d.eval.agentRef || '', schema: SCHEMAS[d.eval.schema] ? d.eval.schema : Object.keys(SCHEMAS)[0], workflow: String(d.eval.workflow || '').trim(), timeoutSec: Math.max(5, Number(d.eval.timeoutSec) || 60), pass: d.eval.pass === 'score' ? 'score' : 'signal', passScore: Math.max(0, Math.min(100, Number(d.eval.passScore) || 70)), veto: !!d.eval.veto };
  const metaPatch = { ver: d.ver.trim(), owner: d.owner.trim(), status: d.status, agents, agent: first ? first.name : '', embed: first ? first.embed : '', eval: ev };
  let sc, meta, isNew = false;
  if (e.id) { sc = scenarioById(e.id); meta = SCENARIO_META[e.id]; }
  else {
    isNew = true; const id = 'sc-' + Date.now().toString(36);
    sc = { id, custom: true, icon: iconSvgFor(d.cat), ...SCN_TINT[d.cat], tag: '', tagKind: '', sessions: '真實場景', youRole: { cn: '', en: '' } };
    meta = {}; SCENARIOS.push(sc); SCENARIO_META[id] = meta;
  }
  Object.assign(sc, scenarioPatch); sc.youRole = { ...sc.youRole, cn: scenarioPatch.youRoleCn };
  Object.assign(meta, metaPatch);
  if (sc.custom) persistCustomScenarios(); else saveScenarioOverride(sc.id, scenarioPatch, metaPatch);
  audit(isNew ? '新增場景' : '編輯場景', `${sc.cn} ${meta.ver}・${meta.status === 'on' ? '已啟用' : '未啟用'}・客戶畫像 ${personas.length} 個・Agent ${agents.length} 組（${agents.filter(g => g.status === 'on').length} 組啟用）`, '場景設定');
  S.editScenario = null;
  if (S.route.name === 'scenario' && S.route.sc === sc.id && meta.status !== 'on') { go('#/hub'); return; }
  render();
}
function personaAdd() {
  const e = S.editScenario; if (!e) return; const d = e.draft; const diffs = d.diffs.split(',').filter(Boolean);
  d.personas.push({ id: 'p-' + Date.now().toString(36), name: '', risk: '', mood: '', temper: '', diff: diffs[0] || 'L2', col: PALETTE[d.personas.length % PALETTE.length] });
  render();
}
function personaDel(idx) { const e = S.editScenario; if (!e) return; const p = e.draft.personas[Number(idx)]; e.draft.personas.splice(Number(idx), 1); e.draft.agents = e.draft.agents.filter(g => !p || g.personaId !== p.id); render(); }
function agentAdd(doRender = true) {
  const e = S.editScenario; if (!e) return; const d = e.draft;
  if (!d.personas.length) { e.error = '請先新增客戶畫像，再配置 Agent'; render(); return; }
  const diffs = d.diffs.split(',').filter(Boolean); const used = new Set(d.agents.map(g => g.personaId + '|' + g.diff));
  let pick = null;
  for (const p of d.personas) { for (const df of (diffs.length ? diffs : [p.diff])) { if (!used.has(p.id + '|' + df)) { pick = { personaId: p.id, diff: df }; break; } } if (pick) break; }
  if (!pick) pick = { personaId: d.personas[0].id, diff: diffs[0] || d.personas[0].diff };
  d.agents.push({ id: 'ag-' + Date.now().toString(36), personaId: pick.personaId, diff: pick.diff, name: '', embed: '', status: 'off' });
  if (doRender) render();
}
function agentDel(idx) { const e = S.editScenario; if (!e) return; e.draft.agents.splice(Number(idx), 1); render(); }

function viewEditScenarioModal() {
  const e = S.editScenario; if (!e) return '';
  const d = e.draft; const isNew = !e.id;
  const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
  const diffList = d.diffs.split(',').filter(Boolean);
  const allowed = catDiffs(d.cat);
  const diffOpts = diffList.length ? diffList : allowed;
  const inUse = k => d.personas.some(p => p.diff === k) || d.agents.some(g => g.diff === k);
  const diffChoices = allowed.map(k => `<label class="chk" title="${inUse(k) ? '有客戶畫像或 Agent 使用中，不能取消' : ''}"><input type="checkbox" data-field="diffs" value="${k}" ${diffList.includes(k) ? 'checked' : ''}><span class="pill" style="color:${DIFF[k].col};background:${DIFF[k].col}1f">${DIFF[k].cn}</span>${inUse(k) ? '<small class="lock">使用中</small>' : ''}</label>`).join('');
  const catHint = CATS[d.cat] ? `場景類型「${esc(CATS[d.cat].short)}」可用：${allowed.map(k => DIFF[k].cn).join('、')}；要增減可用難度請到「參數設定 › 場景類型」。` : '此場景類型已不存在，請先到參數設定建立。';
  const personaRows = d.personas.map((p, i) => `<div class="agent-row">
      <div class="agent-row-hd"><span class="av" style="background:${p.col || PALETTE[i % PALETTE.length]}">${esc(personaInit(p.name))}</span><b>客戶畫像 ${i + 1}</b>
        <button class="btn-ghost sm danger" data-act="personadel" data-arg="${i}" style="margin-left:auto">移除</button></div>
      <div class="form-grid agent-grid">
        <label class="field full-2"><span>名稱 <b>*</b></span><input data-field="personas.${i}.name" value="${esc(p.name || '')}" placeholder="例：複訪 A1 · 上班族拖延 李先生"></label>
        <label class="field"><span>預設難度</span><select data-field="personas.${i}.diff">${diffOpts.map(k => opt(k, p.diff, DIFF[k].cn)).join('')}</select></label>
        <label class="field"><span>屬性標籤</span><input data-field="personas.${i}.risk" list="dl-risks" value="${esc(p.risk || '')}" placeholder="受薪階級 · 年收入 80 萬"></label>
        <label class="field full-2"><span>情緒狀態</span><input data-field="personas.${i}.mood" list="dl-moods" value="${esc(p.mood || '')}" placeholder="客氣、反覆拖延"></label>
        <label class="field full"><span>背景與能力缺口</span><textarea data-field="personas.${i}.temper" rows="2">${esc(p.temper || '')}</textarea></label>
      </div></div>`).join('');
  const agentRows = d.agents.map((g, i) => {
    const src = embedSrc(g.embed); const p = d.personas.find(x => x.id === g.personaId);
    return `<div class="agent-row">
      <div class="agent-row-hd"><b>Agent ${i + 1}</b>${p ? `<span class="pill" style="color:${p.col};background:${p.col}1f">${esc(p.name || '未命名畫像')}</span>` : '<span class="pill bad">畫像已移除</span>'}${DIFF[g.diff] ? `<span class="pill" style="color:${DIFF[g.diff].col};background:${DIFF[g.diff].col}1f">${DIFF[g.diff].cn}</span>` : ''}
        <button class="btn-ghost sm danger" data-act="agentdel" data-arg="${i}" style="margin-left:auto">移除</button></div>
      <div class="form-grid agent-grid">
        <label class="field"><span>客戶畫像</span><select data-field="agents.${i}.personaId">${d.personas.map(x => opt(x.id, g.personaId, x.name || '未命名畫像')).join('')}</select></label>
        <label class="field"><span>難度</span><select data-field="agents.${i}.diff">${diffOpts.map(k => opt(k, g.diff, DIFF[k].cn)).join('')}</select></label>
        <label class="field"><span>狀態</span><select data-field="agents.${i}.status">${opt('on', g.status, '已啟用')}${opt('off', g.status, '未啟用')}</select></label>
        ${(() => { const ls = agentLinkState(g); const pool = AGENTS.filter(a => a.kind === 'drill' && !a.missing); const same = pool.filter(a => a.cat === d.cat), other = pool.filter(a => a.cat !== d.cat);
          const o = a => `<option value="${esc(a.id)}" ${g.agentRef === a.id ? 'selected' : ''} ${a.status !== 'on' ? 'disabled' : ''}>${esc(a.name)}${a.status !== 'on' ? '（停用）' : ''}${!(a.roles || []).length ? '（無可用角色）' : ''}</option>`;
          return `<label class="field full"><span>AltaBots Agent（對應清單）</span><select data-field="agents.${i}.agentRef"><option value="">— 手動貼入 iframe —</option>${same.length ? `<optgroup label="${esc(CATS[d.cat] ? CATS[d.cat].short : d.cat)}">${same.map(o).join('')}</optgroup>` : ''}${other.length ? `<optgroup label="其他場景類型">${other.map(o).join('')}</optgroup>` : ''}</select>
            <small style="color:${ls.level === 'ok' ? '#1E9E63' : ls.level === 'bad' ? 'var(--red)' : ls.level === 'unlinked' ? '#E0882E' : 'var(--muted)'}">${ls.a ? `${ls.level === 'ok' ? '已對應' : '⚠ ' + esc(ls.text)}${ls.level === 'ok' ? '・' + esc(ls.text) : ''}` : ls.level === 'unlinked' ? '⚠ ' + esc(ls.text) : '從成員權限 › Agent 對應 同步的清單中選擇，會自動帶入名稱與嵌入網址'}</small></label>`; })()}
        <label class="field full"><span>Agent 名稱</span><input data-field="agents.${i}.name" value="${esc(g.name)}" placeholder="例：altabots · 信貸電銷對練 Agent · 複訪 A1 · L2"></label>
        <label class="field full"><span>iframe 嵌入代碼 <b>${g.status === 'on' ? '*' : ''}</b></span>
          <textarea data-field="agents.${i}.embed" rows="2" class="mono" ${g.agentRef ? 'readonly' : ''} placeholder='<iframe src="https://agent.sinopac.ai/altabots/app/.../embed" allow="microphone; autoplay"></iframe>'>${esc(g.embed)}</textarea>
          <small>${g.agentRef ? '由對應清單帶入；要改網址請到 Agent 對應編輯，或改選「手動貼入」' : src ? `解析到 src：${esc(src)}` : '貼入 altabots 開發空間提供的嵌入代碼；系統只保留 src。'}</small></label>
      </div></div>`;
  }).join('');
  return `<div class="modal-bg" data-act="cancelscn">
    <div class="modal form wide" data-act="noop">
      <div class="form-hd"><div><h3>${isNew ? '新增場景' : '編輯場景'}</h3><p>${isNew ? '建立新的工作場景、客戶畫像與對練 Agent' : esc(e.id)}　·　儲存後立即生效，並保存在此瀏覽器</p></div>
        <button class="x" data-act="cancelscn" aria-label="關閉">${svg(I.back, 16)}</button></div>
      ${e.error ? `<div class="form-err">${esc(e.error)}</div>` : ''}${e.notice ? `<div class="form-ok">${esc(e.notice)}</div>` : ''}
      <div class="form-grid">
        <label class="field"><span>場景名稱 <b>*</b></span><input data-field="cn" value="${esc(d.cn)}" placeholder="例：複訪"></label>
        <label class="field"><span>英文名稱</span><input data-field="en" value="${esc(d.en)}"></label>
        <label class="field"><span>場景類型</span><select data-field="cat">${Object.keys(CATS).map(k => opt(k, d.cat, CATS[k].short)).join('')}</select></label>
        <label class="field full"><span>說明</span><textarea data-field="desc" rows="2">${esc(d.desc)}</textarea></label>
        <label class="field"><span>你的角色</span><input data-field="youRoleCn" list="dl-roles" value="${esc(d.youRoleCn)}"></label>
        <label class="field"><span>預計時長</span><input data-field="duration" value="${esc(d.duration)}" placeholder="3–8′"></label>
        <label class="field"><span>狀態</span><select data-field="status">${opt('on', d.status, '已啟用')}${opt('off', d.status, '未啟用')}</select></label>
        <label class="field"><span>版本</span><input data-field="ver" value="${esc(d.ver)}"></label>
        <label class="field full-2"><span>維護人</span><input data-field="owner" value="${esc(d.owner)}"></label>
        <div class="field full"><span>難度集合 <b>*</b></span><div class="chks">${diffChoices}</div><small>${catHint}</small></div>
      </div>
      <div class="agents-hd"><div><b>客戶畫像</b><small>AI 扮演的客戶；每個畫像有預設難度，學員可再調整。</small></div>
        <button class="btn-ghost sm" data-act="personaadd">＋ 新增客戶畫像</button></div>
      ${personaRows || '<div class="card empty" style="padding:16px">尚未建立客戶畫像。</div>'}
      <div class="agents-hd"><div><b>對練 Agent 配置</b><small>每組 Agent 對應一個「客戶畫像 × 難度」，難度只能從上方勾選的集合中選；學員選定後，對練中畫面載入對應的 iframe。</small></div>
        <button class="btn-ghost sm" data-act="agentadd">＋ 新增 Agent</button></div>
      ${agentRows || '<div class="card empty" style="padding:16px">尚未配置 Agent，按「新增 Agent」。</div>'}
      <div class="agents-hd"><div><b>評估 Agent（評分 workflow）</b><small>對練結束後由此 Agent 依評分規則出分；評分規則預設跟著場景類型（參數設定），可另選；逾時未回應會標記為暫無評分，可在對練記錄重新觸發。</small></div></div>
      <div class="agent-row"><div class="form-grid agent-grid">
        ${(() => { const pool = AGENTS.filter(a => a.kind === 'eval' && !a.missing); const cur = d.eval.agentRef ? agentById(d.eval.agentRef) : agentForWorkflow(d.eval.workflow);
          return `<label class="field full"><span>AltaBots 評估 Agent（對應清單）</span><select data-field="eval.agentRef"><option value="">— 手動輸入 —</option>${pool.map(a => `<option value="${esc(a.id)}" ${cur && cur.id === a.id ? 'selected' : ''} ${a.status !== 'on' ? 'disabled' : ''}>${esc(a.name)}${CATS[a.cat] ? `（${esc(CATS[a.cat].short)}）` : ''}${a.status !== 'on' ? '（停用）' : ''}</option>`).join('')}</select><small>${cur ? (cur.status === 'on' ? `已對應・${esc(cur.workflow)}` : '⚠ 此評估 Agent 在對應清單為停用') : '選擇後自動帶入名稱與 workflow'}</small></label>`; })()}
        <label class="field full-2"><span>評估 Agent 名稱</span><input data-field="eval.name" value="${esc(d.eval.name)}" placeholder="altabots · 信貸評估 Agent"></label>
        <label class="field"><span>評分規則</span><select data-field="eval.schema">${Object.keys(SCHEMAS).map(k => opt(k, d.eval.schema, SCHEMAS[k].name)).join('')}</select></label>
        <label class="field full-2"><span>workflow／端點</span><input data-field="eval.workflow" class="mono" value="${esc(d.eval.workflow)}" placeholder="wf_credit_eval 或 https://…"></label>
        <label class="field"><span>逾時（秒）</span><input data-field="eval.timeoutSec" type="number" min="5" value="${esc(String(d.eval.timeoutSec))}"></label>
        <label class="field"><span>通關判定</span><select data-field="eval.pass">${opt('signal', d.eval.pass, '達成成交訊號')}${opt('score', d.eval.pass, '分數達門檻')}</select></label>
        <label class="field"><span>分數門檻</span><input data-field="eval.passScore" type="number" min="0" max="100" value="${esc(String(d.eval.passScore))}" ${d.eval.pass === 'score' ? '' : 'disabled'}></label>
        <label class="chk" style="gap:8px;align-self:end;padding-bottom:8px"><input type="checkbox" data-field="eval.veto" ${d.eval.veto ? 'checked' : ''}><span>法遵一票否決</span></label>
        <div class="field full"><small>${SCHEMAS[d.eval.schema] ? `維度：${SCHEMAS[d.eval.schema].dims.map(x => x.cn).join('、')}` : '請先在參數設定建立評分規則'}</small></div>
      </div></div>
      ${personaDatalists()}
      <div class="form-ft"><button class="btn-ghost" data-act="cancelscn">取消</button><button class="btn-primary" data-act="savescn">${isNew ? '建立場景' : '儲存'}</button></div>
    </div></div>`;
}

/* ------------------------------------------------------------------ 成員權限：可編輯、CSV／API 匯入、角色權限矩陣 */
const LS = { members: 'sinopac-coach.members', roles: 'sinopac-coach.roles', org: 'sinopac-coach.org', audit: 'sinopac-coach.audit' };
const PALETTE = ['#D81E26', '#2D6CC0', '#009E96', '#E0882E', '#6A5BC4'];
const ALTABOTS_MEMBERS_API = 'https://altabots.sinopac.ai/api/v1/workspaces/sinopac-drill/members';

// 數據報表與系統設定的導覽權限，跟著角色管理頁的設定走；預設值等同原本 CAN 的規則
const ROLE_PERMS = {};
Object.keys(ROLES).forEach(k => {
  const r = ROLES[k];
  ROLE_PERMS[k] = { insights: r.scope !== 'self', stats: r.scope !== 'self', scenarioSettings: r.rank >= 2, settings: r.rank >= 4 };
});
CAN.stats = u => !!(ROLE_PERMS[u.role] && (ROLE_PERMS[u.role].insights || ROLE_PERMS[u.role].stats));
CAN.settings = u => !!(ROLE_PERMS[u.role] && ROLE_PERMS[u.role].settings);
CAN.scenarioSettings = u => !!(ROLE_PERMS[u.role] && (ROLE_PERMS[u.role].scenarioSettings || ROLE_PERMS[u.role].settings));

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
function orgUnits(tree = ORG) { const out = []; (function walk(n, depth, parent) { if (depth === 2) out.push({ ...n, parent }); (n.children || []).forEach(ch => walk(ch, depth + 1, n)); })(tree, 0, null); return out; }
function rebuildUnits() { Object.keys(UNITS).forEach(k => delete UNITS[k]); orgUnits().forEach(u => { UNITS[u.id] = u.name; }); }
function findOrgNode(id, n = ORG, parent = null, depth = 0) {
  if (n.id === id) return { node: n, parent, depth };
  for (const ch of (n.children || [])) { const hit = findOrgNode(id, ch, n, depth + 1); if (hit) return hit; }
  return null;
}
function loadOrgOverrides() {
  const m = lsGet(LS.members); if (Array.isArray(m) && m.length) { MEMBERS.splice(0, MEMBERS.length, ...m); }
  const r = lsGet(LS.roles); if (r) Object.keys(r).forEach(k => {
    if (!ROLES[k]) { if (!r[k].cn) return; ROLES[k] = { cn: r[k].cn, scope: r[k].scope || 'self', rank: r[k].rank || 1, custom: true }; ROLE_PERMS[k] = { insights: false, stats: false, scenarioSettings: false, settings: false }; }
    if (r[k].cn) ROLES[k].cn = r[k].cn; if (r[k].scope) ROLES[k].scope = r[k].scope; if (r[k].perms) Object.assign(ROLE_PERMS[k], r[k].perms);
  });
  const o = lsGet(LS.org); if (o && o.children) { Object.assign(ORG, o); rebuildUnits(); }
  const au = lsGet(LS.audit); if (Array.isArray(au) && au.length) AUDIT.unshift(...au);
}
function persistMembers() { lsSet(LS.members, MEMBERS); }
function persistRoles() { const out = {}; Object.keys(ROLES).forEach(k => { out[k] = { cn: ROLES[k].cn, scope: ROLES[k].scope, rank: ROLES[k].rank, custom: !!ROLES[k].custom, perms: ROLE_PERMS[k] }; }); lsSet(LS.roles, out); }

/* 角色類型：可新增、編輯、刪除（內建六種不可刪；系統擁有者不可改）；成員表單與 CSV 匯入的角色下拉同步讀取 ROLES */
const SCOPE_LABEL = { all: '全行', team: '本人與下屬', self: '僅本人' };
function openRole(code) {
  const r = code ? ROLES[code] : null; const p = code ? ROLE_PERMS[code] : null;
  openDlg('role', r ? { code, cn: r.cn, scope: r.scope, insights: !!p.insights, stats: !!p.stats, scenarioSettings: !!p.scenarioSettings, settings: !!p.settings, builtin: !r.custom }
                    : { code: '', cn: '', scope: 'self', insights: false, stats: false, scenarioSettings: false, settings: false, builtin: false });
}
function saveRole() {
  const d = S.dlg.draft; const errs = [];
  if (!d.cn.trim()) errs.push('角色名稱必填');
  const dup = Object.keys(ROLES).find(k => ROLES[k].cn === d.cn.trim() && k !== d.code); if (dup) errs.push('角色名稱已存在');
  if (!d.code && !/^[A-Z][A-Z0-9_]{1,23}$/.test((d.newCode || '').trim().toUpperCase()) && (d.newCode || '').trim()) errs.push('角色代碼須為英文大寫、數字或底線');
  if (errs.length) { S.dlg.error = errs.join('；'); render(); return; }
  const perms = { insights: !!d.insights, stats: !!d.stats, scenarioSettings: !!d.scenarioSettings, settings: !!d.settings };
  const rank = perms.settings ? 4 : perms.scenarioSettings ? 2 : 1;
  if (d.code) {
    if (d.code !== 'OWNER') { ROLES[d.code].cn = d.cn.trim(); ROLES[d.code].scope = d.scope; ROLES[d.code].rank = ROLES[d.code].custom ? rank : ROLES[d.code].rank; Object.assign(ROLE_PERMS[d.code], perms); }
    audit('編輯角色', `${ROLES[d.code].cn}（${SCOPE_LABEL[ROLES[d.code].scope]}）`);
  } else {
    let code = (d.newCode || '').trim().toUpperCase() || ('ROLE_' + Date.now().toString(36).toUpperCase());
    if (ROLES[code]) code += '_' + Math.random().toString(36).slice(2, 5).toUpperCase();
    ROLES[code] = { cn: d.cn.trim(), scope: d.scope, rank, custom: true }; ROLE_PERMS[code] = perms;
    audit('新增角色', `${d.cn.trim()}（${SCOPE_LABEL[d.scope]}）代碼 ${code}`);
  }
  persistRoles(); S.dlg = null; render();
}
function deleteRole(code) {
  const r = ROLES[code]; if (!r) return;
  if (!r.custom) { alert('內建角色不可刪除，可調整其權限'); return; }
  const n = MEMBERS.filter(m => m.role === code).length; if (n) { alert(`仍有 ${n} 位成員使用此角色，請先調整成員角色`); return; }
  if (!confirm(`刪除角色「${r.cn}」？`)) return;
  delete ROLES[code]; delete ROLE_PERMS[code]; persistRoles(); audit('刪除角色', `${r.cn}（${code}）`); render();
}
function persistOrg() { lsSet(LS.org, ORG); rebuildUnits(); }
function audit(act, detail, mod = '成員權限') {
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  AUDIT.unshift({ at: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`, mod, act, who: S.user ? S.user.name : '系統', detail });
  const saved = lsGet(LS.audit) || []; saved.unshift(AUDIT[0]); lsSet(LS.audit, saved.slice(0, 200));
}
function nextMemberId() { let n = 0; MEMBERS.forEach(m => { const x = parseInt(String(m.id).replace(/\D/g, ''), 10); if (x > n) n = x; }); return 'SP-' + String(n + 1).padStart(4, '0'); }
function roleByName(v) { v = String(v || '').trim(); if (ROLES[v]) return v; const hit = Object.keys(ROLES).find(k => ROLES[k].cn === v || ROLES[k].cn.replace(/\s/g, '') === v.replace(/\s/g, '')); return hit || null; }
function unitByName(v) { v = String(v || '').trim(); if (UNITS[v]) return v; const hit = orgUnits().find(u => u.name === v || u.code === v); return hit ? hit.id : null; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function openDlg(kind, draft) { S.dlg = { kind, draft, error: null, result: null }; render(); }
function closeDlg() { S.dlg = null; render(); }

/* 成員 */
function openMember(id) {
  const m = id ? memberById(id) : null;
  openDlg('member', m ? { id: m.id, name: m.name, email: m.email, role: m.role, unit: m.unit, active: !!m.active }
                      : { id: '', name: '', email: '', role: 'ADVISOR_JR', unit: orgUnits()[0] ? orgUnits()[0].id : '', active: true });
}
function saveMember() {
  const d = S.dlg.draft; const errs = [];
  if (!d.name.trim()) errs.push('姓名必填');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) errs.push('電子郵箱格式不正確');
  if (!ROLES[d.role]) errs.push('角色無效');
  if (!UNITS[d.unit]) errs.push('所屬單位無效');
  const dup = MEMBERS.find(m => m.email.toLowerCase() === d.email.trim().toLowerCase() && m.id !== d.id); if (dup) errs.push(`電子郵箱已被 ${dup.name} 使用`);
  if (errs.length) { S.dlg.error = errs.join('；'); render(); return; }
  if (d.id) {
    const m = memberById(d.id); Object.assign(m, { name: d.name.trim(), email: d.email.trim(), role: d.role, unit: d.unit, active: !!d.active });
    audit('編輯成員', `${m.name}（${ROLES[m.role].cn}・${UNITS[m.unit]}）${m.active ? '' : '・已停用'}`);
    if (S.user && S.user.id === m.id) S.user = m;
  } else {
    const m = { id: nextMemberId(), name: d.name.trim(), email: d.email.trim(), role: d.role, unit: d.unit, col: PALETTE[MEMBERS.length % PALETTE.length], active: !!d.active, joined: todayStr() };
    MEMBERS.push(m); audit('新增帳號', `建立 ${m.name}（${ROLES[m.role].cn}・${UNITS[m.unit]}）`);
  }
  persistMembers(); S.dlg = null; render();
}
function toggleMember(id) {
  const m = memberById(id); if (!m) return;
  if (S.user && S.user.id === id) { alert('不能停用目前登入的帳號'); return; }
  m.active = !m.active; persistMembers(); audit(m.active ? '啟用成員' : '停用成員', `${m.name}（${UNITS[m.unit]}）${m.active ? '' : '，保留歷史對練記錄'}`); render();
}

/* CSV 匯入 */
const CSV_SAMPLE = 'name,email,role,unit\n陳建宏,chienhung.chen@sinopac.com,ADVISOR_JR,phone\n黃雅君,yachun.huang@sinopac.com,理專｜1年以上,分行通路';
function parseCsv(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], error: '沒有內容' };
  const head = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = { name: head.indexOf('name'), email: head.indexOf('email'), role: head.indexOf('role'), unit: head.indexOf('unit') };
  if (Object.values(idx).some(i => i < 0)) return { rows: [], error: '標題列須包含 name,email,role,unit' };
  const rows = lines.slice(1).map((l, i) => {
    const c = l.split(',').map(x => x.trim());
    const r = { line: i + 2, name: c[idx.name] || '', email: c[idx.email] || '', roleIn: c[idx.role] || '', unitIn: c[idx.unit] || '' };
    r.role = roleByName(r.roleIn); r.unit = unitByName(r.unitIn);
    const existing = MEMBERS.find(m => m.email.toLowerCase() === r.email.toLowerCase());
    r.mode = existing ? 'update' : 'create';
    r.problems = [];
    if (!r.name) r.problems.push('缺姓名'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) r.problems.push('郵箱格式');
    if (!r.role) r.problems.push('角色無法對應'); if (!r.unit) r.problems.push('單位無法對應');
    return r;
  });
  return { rows, error: null };
}
function openCsv() { openDlg('csv', { text: '', rows: null, parseError: null }); }
function csvParse() { const d = S.dlg.draft; const r = parseCsv(d.text); d.rows = r.rows; d.parseError = r.error; S.dlg.error = null; render(); }
function csvImport() {
  const d = S.dlg.draft; if (!d.rows) csvParse(); if (!d.rows || !d.rows.length) { S.dlg.error = '沒有可匯入的資料列'; render(); return; }
  const ok = d.rows.filter(r => !r.problems.length); if (!ok.length) { S.dlg.error = '所有資料列都有問題，請修正後重新解析'; render(); return; }
  let created = 0, updated = 0;
  ok.forEach(r => {
    const m = MEMBERS.find(x => x.email.toLowerCase() === r.email.toLowerCase());
    if (m) { Object.assign(m, { name: r.name, role: r.role, unit: r.unit }); updated++; }
    else { MEMBERS.push({ id: nextMemberId(), name: r.name, email: r.email, role: r.role, unit: r.unit, col: PALETTE[MEMBERS.length % PALETTE.length], active: true, joined: todayStr() }); created++; }
  });
  persistMembers(); audit('CSV 匯入', `新增 ${created} 位、更新 ${updated} 位，略過 ${d.rows.length - ok.length} 列`);
  S.dlg.result = `匯入完成：新增 ${created} 位、更新 ${updated} 位${d.rows.length - ok.length ? `，略過 ${d.rows.length - ok.length} 列有問題的資料` : ''}。`; S.dlg.error = null; d.rows = null; d.text = ''; render();
}

/* API 同步（altabots 工作空間） */
function openApi() { openDlg('api', { endpoint: ALTABOTS_MEMBERS_API, token: '', mode: 'merge' }); }
function apiSync() {
  const d = S.dlg.draft;
  if (!/^https:\/\//i.test(d.endpoint.trim())) { S.dlg.error = 'API 端點須為 https://'; render(); return; }
  if (!d.token.trim()) { S.dlg.error = '請輸入 altabots 工作空間的 API Token'; render(); return; }
  // 原型：模擬同步結果，不實際呼叫；正式版由後端以 token 拉取成員與角色並依 16.2 對應表寫入
  const n = MEMBERS.length;
  MEMBERS.forEach(m => { m.synced = todayStr(); }); persistMembers();
  audit('API 同步', `自 altabots 工作空間同步 ${n} 位成員（${d.mode === 'merge' ? '合併' : '覆蓋'}模式）`);
  S.dlg.result = `已自 altabots 同步 ${n} 位成員（示範，未實際呼叫 API）。角色依 16.2 對應表映射。`; S.dlg.error = null; render();
}

/* ------------------------------------------------------------------ 角色與 Agent 對應清單：自 AltaBots.ai 工作空間同步 */
const ALTABOTS_APPS_API = 'https://altabots.sinopac.ai/api/v1/workspaces/sinopac-drill/apps';
const LS_AGENTS = 'sinopac-coach.agents';
const AGENTS = [];              // { id, name, kind: 'drill'|'eval', src, workflow, cat, roles: [roleCode], status: 'on'|'off', synced, source: 'altabots'|'local' }
const ROLE_BYPASS = ['OWNER', 'ADMIN'];   // 系統擁有者／管理員不受 Agent 角色限制
const agentById = id => AGENTS.find(a => a.id === id) || null;
function agentForSrc(src) { if (!src) return null; const norm = x => String(x || '').replace(/\/+$/, ''); return AGENTS.find(a => a.kind === 'drill' && norm(a.src) === norm(src)) || null; }
function agentForWorkflow(wf) { if (!wf) return null; return AGENTS.find(a => a.kind === 'eval' && (a.workflow === wf || a.src === wf)) || null; }
/* 場景裡哪些 Agent 組／評估設定用到這個對應項 */
function agentUsage(a) {
  const out = [];
  SCENARIOS.forEach(sc => {
    if (a.kind === 'drill') ensureAgents(sc.id).forEach(g => { if (g.agentRef === a.id || (!g.agentRef && agentForSrc(embedSrc(g.embed)) === a)) out.push({ sc, g }); });
    else { const ev = ensureEval(sc.id); if (ev && (ev.agentRef === a.id || (!ev.agentRef && agentForWorkflow(ev.workflow) === a))) out.push({ sc, ev }); }
  });
  return out;
}
function roleCanUseAgent(roleCode, a) { if (!a) return true; if (ROLE_BYPASS.includes(roleCode)) return true; return (a.roles || []).includes(roleCode); }
function nowStr() { const d = new Date(); const pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
/* 模擬 AltaBots 工作空間回傳的 App 清單：每個場景的對練 Agent（客戶畫像 × 難度）與評估 Agent 各一個 App，角色依場景類型映射（16.2） */
function altabotsAppsSnapshot() {
  const rolesFor = () => ['ADVISOR_JR', 'ADVISOR_SR', 'TRAINER', 'MANAGER'];   // 示範：所有理專、培訓人員與主管皆可用；實際以工作空間群組為準
  const list = [];
  SCENARIOS.forEach(sc => {
    ensureAgents(sc.id).forEach((g, i) => { const src = embedSrc(g.embed); if (!src) return; const p = sc.personas.find(x => x.id === g.personaId);
      list.push({ id: g.agentRef || ('app_' + sc.id.replace(/[^a-z0-9]/gi, '') + '_' + (p ? p.id : i) + '_' + g.diff).toLowerCase(), name: g.name || `${sc.cn} 對練 Agent`, kind: 'drill', src, workflow: '', cat: sc.cat, roles: rolesFor(sc.cat), status: 'on' }); });
    const ev = ensureEval(sc.id); if (ev && ev.workflow) list.push({ id: ev.agentRef || ('app_eval_' + sc.id.replace(/[^a-z0-9]/gi, '')).toLowerCase(), name: ev.name || `${sc.cn} 評估 Agent`, kind: 'eval', src: '', workflow: ev.workflow, cat: sc.cat, roles: rolesFor(sc.cat).concat('TRAINER'), status: 'on' });
  });
  const seen = new Set(); return list.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); a.roles = [...new Set(a.roles)]; return true; });
}
function persistAgents() { lsSet(LS_AGENTS, { list: AGENTS, syncedAt: S.agentsSyncedAt || null }); }
function loadAgents() {
  const saved = lsGet(LS_AGENTS);
  if (saved && Array.isArray(saved.list)) { AGENTS.splice(0, AGENTS.length, ...saved.list); S.agentsSyncedAt = saved.syncedAt || null; }
  else { // 示範資料：視為已於建置時自 AltaBots 同步一次
    const snap = altabotsAppsSnapshot(); const t = '2026/10/01 09:30';
    AGENTS.splice(0, AGENTS.length, ...snap.map(a => ({ ...a, synced: t, source: 'altabots' }))); S.agentsSyncedAt = t;
  }
  // 把場景裡的 Agent／評估設定依網址／端點對回對應清單，之後以 agentRef 為準
  SCENARIOS.forEach(sc => { ensureAgents(sc.id).forEach(g => { if (!g.agentRef) { const a = agentForSrc(embedSrc(g.embed)); if (a) g.agentRef = a.id; } }); const ev = ensureEval(sc.id); if (ev && !ev.agentRef) { const a = agentForWorkflow(ev.workflow); if (a) ev.agentRef = a.id; } });
}
function openAgentApi() { openDlg('agentapi', { endpoint: ALTABOTS_APPS_API, token: '', mode: 'merge' }); }
function agentApiSync() {
  const d = S.dlg.draft;
  if (!/^https:\/\//i.test(d.endpoint.trim())) { S.dlg.error = 'API 端點須為 https://'; render(); return; }
  if (!d.token.trim()) { S.dlg.error = '請輸入 AltaBots 工作空間的 API Token'; render(); return; }
  const snap = altabotsAppsSnapshot(); const t = nowStr(); let added = 0, updated = 0, removed = 0;
  snap.forEach(a => { const cur = agentById(a.id); if (cur) { Object.assign(cur, { name: a.name, kind: a.kind, src: a.src, workflow: a.workflow, cat: a.cat, roles: a.roles, status: a.status, synced: t, source: 'altabots' }); updated++; } else { AGENTS.push({ ...a, synced: t, source: 'altabots' }); added++; } });
  if (d.mode === 'replace') { for (let i = AGENTS.length - 1; i >= 0; i--) { const a = AGENTS[i]; if (a.source === 'altabots' && !snap.some(x => x.id === a.id)) { if (agentUsage(a).length) { a.status = 'off'; a.missing = true; } else { AGENTS.splice(i, 1); removed++; } } } }
  S.agentsSyncedAt = t; persistAgents();
  audit('同步 Agent 對應', `自 AltaBots 工作空間同步 ${snap.length} 個 Agent（新增 ${added}、更新 ${updated}、移除 ${removed}；${d.mode === 'merge' ? '合併' : '覆蓋'}模式）`, '成員權限');
  S.dlg.result = `已自 AltaBots 同步 ${snap.length} 個 Agent：新增 ${added}、更新 ${updated}、移除 ${removed}（示範，未實際呼叫 API）。角色對應依 16.2 映射，場景中仍在使用但工作空間已不存在的 Agent 標記為停用而不刪除。`; S.dlg.error = null; render();
}
function openAgentDlg(id) {
  const a = id ? agentById(id) : null;
  openDlg('agent', a ? { id: a.id, name: a.name, kind: a.kind, src: a.src || '', workflow: a.workflow || '', cat: a.cat || '', roles: (a.roles || []).join(','), status: a.status, source: a.source, synced: a.synced || '' }
    : { id: '', name: '', kind: 'drill', src: '', workflow: '', cat: Object.keys(CATS)[0] || '', roles: '', status: 'on', source: 'local', synced: '' });
}
function saveAgentDlg() {
  const g = S.dlg; const d = g.draft; const errs = [];
  if (!d.name.trim()) errs.push('Agent 名稱必填');
  if (d.kind === 'drill' && !/^https:\/\//i.test(d.src.trim())) errs.push('對練 Agent 的嵌入網址須為 https://');
  if (d.kind === 'eval' && !d.workflow.trim()) errs.push('評估 Agent 須填 workflow／端點');
  const roles = d.roles.split(',').filter(k => ROLES[k]); if (!roles.length) errs.push('至少勾選一個可用角色，否則沒有人能使用此 Agent');
  if (!d.id) { const dup = d.kind === 'drill' ? agentForSrc(d.src.trim()) : agentForWorkflow(d.workflow.trim()); if (dup) errs.push(`已有對應項「${dup.name}」使用相同的${d.kind === 'drill' ? '嵌入網址' : '端點'}`); }
  if (errs.length) { g.error = errs.join('；'); render(); return; }
  if (d.id) { const a = agentById(d.id); Object.assign(a, { name: d.name.trim(), kind: d.kind, src: d.src.trim(), workflow: d.workflow.trim(), cat: d.cat, roles, status: d.status }); if (a.source === 'altabots') a.edited = true; audit('編輯 Agent 對應', `${a.name}・角色 ${roles.map(r => ROLES[r].cn).join('、')}・${d.status === 'on' ? '啟用' : '停用'}`, '成員權限'); }
  else { const id = 'local_' + Date.now().toString(36); AGENTS.push({ id, name: d.name.trim(), kind: d.kind, src: d.src.trim(), workflow: d.workflow.trim(), cat: d.cat, roles, status: d.status, source: 'local', synced: '' }); audit('新增 Agent 對應', `${d.name.trim()}（本地）・角色 ${roles.map(r => ROLES[r].cn).join('、')}`, '成員權限'); }
  persistAgents(); S.dlg = null; render();
}
function deleteAgent(id) {
  const a = agentById(id); if (!a) return; const use = agentUsage(a);
  if (use.length) { alert(`「${a.name}」仍被 ${use.length} 個場景設定使用（${[...new Set(use.map(u => u.sc.cn))].join('、')}），請先到場景設定改選其他 Agent`); return; }
  if (!confirm(`移除對應項「${a.name}」？${a.source === 'altabots' ? '（下次同步若工作空間仍有此 App 會再出現）' : ''}`)) return;
  AGENTS.splice(AGENTS.indexOf(a), 1); persistAgents(); audit('移除 Agent 對應', `${a.name}（${a.id}）`, '成員權限'); render();
}
/* 對練 Agent 組在對應清單中的狀態：供場景編輯、Agent 配置、發起對練做防呆 */
function agentLinkState(g) {
  const a = g.agentRef ? agentById(g.agentRef) : agentForSrc(embedSrc(g.embed));
  if (!a) return { a: null, level: g.embed ? 'unlinked' : 'none', text: g.embed ? '不在 AltaBots 對應清單，無法檢核角色權限' : '' };
  if (a.missing) return { a, level: 'bad', text: 'AltaBots 工作空間已找不到此 App' };
  if (a.status !== 'on') return { a, level: 'bad', text: '此 Agent 在對應清單為停用' };
  if (!(a.roles || []).length) return { a, level: 'bad', text: '此 Agent 沒有任何可用角色' };
  return { a, level: 'ok', text: `可用角色：${a.roles.map(r => ROLES[r] ? ROLES[r].cn : r).join('、')}` };
}

/* 角色權限 */
function setRolePerm(role, key, value) {
  if (!ROLES[role]) return;
  if (key === 'scope') ROLES[role].scope = value;
  else ROLE_PERMS[role][key] = !!value;
  persistRoles(); audit('角色調整', `${ROLES[role].cn}：${{ scope: '資料範圍', insights: '洞察分析', stats: '對練統計', scenarioSettings: '場景設定', settings: '系統設定' }[key]} → ${key === 'scope' ? { all: '全行', team: '本人與下屬', self: '僅本人' }[value] : (value ? '開' : '關')}`);
  render();
}

/* 組織 */
function openOrg(mode, id) {
  if (mode === 'add') { const hit = findOrgNode(id); openDlg('org', { mode: 'add', parent: id, parentName: hit.node.name, depth: hit.depth + 1, name: '', code: '' }); return; }
  const hit = findOrgNode(id); if (!hit) return;
  const parents = hit.depth === 2 ? ORG.children.map(d => ({ id: d.id, name: d.name })) : [];
  openDlg('org', { mode: 'edit', id, depth: hit.depth, name: hit.node.name, code: hit.node.code, parent: hit.parent ? hit.parent.id : '', parents });
}
function saveOrg() {
  const d = S.dlg.draft; const errs = [];
  if (!d.name.trim()) errs.push('名稱必填'); if (!d.code.trim()) errs.push('代碼必填');
  const codeDup = (function walk(n) { if (n.code === d.code.trim() && n.id !== d.id) return true; return (n.children || []).some(walk); })(ORG); if (codeDup) errs.push('代碼已存在');
  if (errs.length) { S.dlg.error = errs.join('；'); render(); return; }
  if (d.mode === 'add') {
    const hit = findOrgNode(d.parent); const node = { id: 'org-' + Date.now().toString(36), name: d.name.trim(), code: d.code.trim() };
    if (d.depth === 1) node.children = [];
    (hit.node.children = hit.node.children || []).push(node); audit('新增組織', `${hit.node.name} → ${node.name}（${node.code}）`);
  } else {
    const hit = findOrgNode(d.id); Object.assign(hit.node, { name: d.name.trim(), code: d.code.trim() });
    if (hit.depth === 2 && d.parent && hit.parent.id !== d.parent) {
      hit.parent.children = hit.parent.children.filter(x => x.id !== d.id); const np = findOrgNode(d.parent).node; (np.children = np.children || []).push(hit.node);
      audit('移動組織', `${hit.node.name} 移至 ${np.name}`);
    } else audit('編輯組織', `${hit.node.name}（${hit.node.code}）`);
  }
  persistOrg(); S.dlg = null; render();
}
function deleteOrg(id) {
  const hit = findOrgNode(id); if (!hit || !hit.parent) return;
  if ((hit.node.children || []).length) { alert('此節點底下仍有單位，無法刪除'); return; }
  if (MEMBERS.some(m => m.unit === id)) { alert('此單位仍有成員，請先移動成員'); return; }
  if (!confirm(`刪除「${hit.node.name}」？`)) return;
  hit.parent.children = hit.parent.children.filter(x => x.id !== id); persistOrg(); audit('刪除組織', `${hit.node.name}（${hit.node.code}）`); render();
}

/* 組織 CSV 匯入：每列一個單位（處不存在則一併建立；同代碼則更新名稱／移動） */
const ORG_CSV_SAMPLE = 'division_code,division_name,unit_code,unit_name\nDIV-14,消費金融處,U-141,電銷一科\nDIV-14,消費金融處,U-142,電銷二科\nDIV-12,通路管理處,U-123,數位客服';
function parseOrgCsv(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], error: '沒有內容' };
  const head = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = { dc: head.indexOf('division_code'), dn: head.indexOf('division_name'), uc: head.indexOf('unit_code'), un: head.indexOf('unit_name') };
  if (idx.dc < 0 || idx.dn < 0) return { rows: [], error: '標題列須包含 division_code,division_name（單位欄位 unit_code,unit_name 可選）' };
  const allNodes = []; (function walk(n, depth) { allNodes.push({ ...n, depth }); (n.children || []).forEach(ch => walk(ch, depth + 1)); })(ORG, 0);
  const seenUnit = new Set();
  const rows = lines.slice(1).map((l, i) => {
    const cells = l.split(',').map(x => x.trim());
    const r = { line: i + 2, dc: cells[idx.dc] || '', dn: cells[idx.dn] || '', uc: idx.uc >= 0 ? (cells[idx.uc] || '') : '', un: idx.un >= 0 ? (cells[idx.un] || '') : '', problems: [], actions: [] };
    if (!r.dc || !r.dn) r.problems.push('處代碼或名稱缺漏');
    const div = ORG.children.find(d => d.code === r.dc);
    if (div) { if (div.name !== r.dn) r.actions.push('更新處名稱'); } else { const clash = allNodes.find(n => n.code === r.dc); if (clash) r.problems.push('處代碼與其他層級重複'); else r.actions.push('新增處'); }
    if (r.uc || r.un) {
      if (!r.uc || !r.un) r.problems.push('單位代碼或名稱缺漏');
      else {
        if (seenUnit.has(r.uc)) r.problems.push('單位代碼在檔案內重複'); seenUnit.add(r.uc);
        const unit = allNodes.find(n => n.depth === 2 && n.code === r.uc);
        if (unit) { const parent = ORG.children.find(d => (d.children || []).some(u => u.id === unit.id)); if (unit.name !== r.un) r.actions.push('更新單位名稱'); if (parent && parent.code !== r.dc) r.actions.push(`移動單位（${parent.name} → ${r.dn}）`); }
        else { const clash = allNodes.find(n => n.code === r.uc); if (clash) r.problems.push('單位代碼與其他層級重複'); else r.actions.push('新增單位'); }
      }
    }
    if (!r.problems.length && !r.actions.length) r.actions.push('無變更');
    return r;
  });
  return { rows, error: null };
}
function openOrgCsv() { openDlg('orgcsv', { text: '', rows: null, parseError: null }); }
function orgCsvParse() { const d = S.dlg.draft; const r = parseOrgCsv(d.text); d.rows = r.rows; d.parseError = r.error; S.dlg.error = null; render(); }
function orgCsvImport() {
  const d = S.dlg.draft; if (!d.rows) orgCsvParse(); if (!d.rows || !d.rows.length) { S.dlg.error = '沒有可匯入的資料列'; render(); return; }
  const ok = d.rows.filter(r => !r.problems.length); if (!ok.length) { S.dlg.error = '所有資料列都有問題，請修正後重新解析'; render(); return; }
  let addedDiv = 0, addedUnit = 0, updated = 0, moved = 0;
  ok.forEach(r => {
    let div = ORG.children.find(x => x.code === r.dc);
    if (!div) { div = { id: 'org-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: r.dn, code: r.dc, children: [] }; ORG.children.push(div); addedDiv++; }
    else if (div.name !== r.dn) { div.name = r.dn; updated++; }
    if (r.uc && r.un) {
      let unit = null, parent = null; ORG.children.forEach(dv => (dv.children || []).forEach(u => { if (u.code === r.uc) { unit = u; parent = dv; } }));
      if (!unit) { (div.children = div.children || []).push({ id: 'org-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: r.un, code: r.uc }); addedUnit++; }
      else { if (unit.name !== r.un) { unit.name = r.un; updated++; } if (parent && parent.id !== div.id) { parent.children = parent.children.filter(u => u.id !== unit.id); (div.children = div.children || []).push(unit); moved++; } }
    }
  });
  persistOrg(); audit('CSV 匯入組織', `新增處 ${addedDiv}、新增單位 ${addedUnit}、更新 ${updated}、移動 ${moved}，略過 ${d.rows.length - ok.length} 列`);
  S.dlg.result = `匯入完成：新增處 ${addedDiv}、新增單位 ${addedUnit}、更新名稱 ${updated}、移動單位 ${moved}${d.rows.length - ok.length ? `，略過 ${d.rows.length - ok.length} 列有問題的資料` : ''}。`; S.dlg.error = null; d.rows = null; d.text = ''; render();
}

function personaDatalists() {
  const dl = (id, arr) => `<datalist id="${id}">${arr.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  return dl('dl-moods', PERSONA_OPTS.moods) + dl('dl-risks', PERSONA_OPTS.risks) + dl('dl-roles', PERSONA_OPTS.roles);
}
function viewDlg() {
  const g = S.dlg; if (!g) return '';
  const d = g.draft;
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  const err = g.error ? `<div class="form-err">${esc(g.error)}</div>` : '';
  const ok = g.result ? `<div class="form-ok">${esc(g.result)}</div>` : '';
  let title = '', sub = '', body = '', foot = '';
  if (g.kind === 'member') {
    title = d.id ? '編輯成員' : '新增成員'; sub = d.id ? d.id : '建立可登入對練系統的成員帳號，並指定角色與單位';
    body = `<div class="form-grid">
      <label class="field"><span>姓名 <b>*</b></span><input data-field="name" value="${esc(d.name)}"></label>
      <label class="field full-2"><span>電子郵箱 <b>*</b></span><input data-field="email" value="${esc(d.email)}" placeholder="name@sinopac.com"></label>
      <label class="field"><span>角色</span><select data-field="role">${Object.keys(ROLES).map(k => opt(k, d.role, ROLES[k].cn)).join('')}</select></label>
      <label class="field"><span>所屬單位</span><select data-field="unit">${orgUnits().map(u => opt(u.id, d.unit, `${u.parent.name}／${u.name}`)).join('')}</select></label>
      <label class="field"><span>狀態</span><select data-field="active" data-type="bool">${opt('true', String(d.active), '啟用')}${opt('false', String(d.active), '停用')}</select></label>
      <div class="field full"><small>資料範圍與可見報表由角色決定（角色管理頁）：${esc({ all: '全行', team: '本人與下屬', self: '僅本人' }[ROLES[d.role] ? ROLES[d.role].scope : 'self'])}。</small></div>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="membersave">儲存</button>`;
  } else if (g.kind === 'csv') {
    title = 'CSV 匯入成員'; sub = '欄位：name,email,role,unit；role 可填代碼或名稱，unit 可填代碼、名稱或單位 ID；以 email 判斷新增或更新';
    const preview = d.rows ? `<div class="field full"><span>解析結果　${d.rows.filter(r => !r.problems.length).length}／${d.rows.length} 列可匯入</span>
      <div class="csv-prev"><table class="tbl"><thead><tr><th>#</th><th>姓名</th><th>郵箱</th><th>角色</th><th>單位</th><th>動作</th></tr></thead><tbody>
      ${d.rows.map(r => `<tr class="${r.problems.length ? 'bad' : ''}"><td class="mono">${r.line}</td><td>${esc(r.name)}</td><td style="font-size:12px">${esc(r.email)}</td>
        <td>${r.role ? esc(ROLES[r.role].cn) : `<span class="pill bad">${esc(r.roleIn || '—')}</span>`}</td><td>${r.unit ? esc(UNITS[r.unit]) : `<span class="pill bad">${esc(r.unitIn || '—')}</span>`}</td>
        <td>${r.problems.length ? `<span class="pill bad">${esc(r.problems.join('、'))}</span>` : `<span class="pill ${r.mode === 'create' ? 'good' : 'info'}">${r.mode === 'create' ? '新增' : '更新'}</span>`}</td></tr>`).join('')}
      </tbody></table></div></div>` : '';
    body = `<div class="form-grid">
      <div class="field full"><span>選擇檔案</span><input type="file" accept=".csv,text/csv" data-file="csv"><small>或直接貼入下方文字區。</small></div>
      <label class="field full"><span>CSV 內容</span><textarea data-field="text" rows="6" class="mono" placeholder="${esc(CSV_SAMPLE)}">${esc(d.text)}</textarea></label>
      ${d.parseError ? `<div class="form-err full">${esc(d.parseError)}</div>` : ''}
      ${preview}
    </div>`;
    foot = `<button class="btn-ghost" data-act="csvsample">帶入範例</button><button class="btn-ghost" data-act="csvparse">解析預覽</button><button class="btn-ghost" data-act="dlgcancel">${g.result ? '關閉' : '取消'}</button><button class="btn-primary" data-act="csvimport">匯入</button>`;
  } else if (g.kind === 'orgcsv') {
    title = 'CSV 匯入組織'; sub = '欄位：division_code,division_name,unit_code,unit_name；每列一個單位，處不存在會一併建立；同代碼更新名稱或移動';
    const preview = d.rows ? `<div class="field full"><span>解析結果　${d.rows.filter(r => !r.problems.length).length}／${d.rows.length} 列可匯入</span>
      <div class="csv-prev"><table class="tbl"><thead><tr><th>#</th><th>處</th><th>單位</th><th>動作</th></tr></thead><tbody>
      ${d.rows.map(r => `<tr class="${r.problems.length ? 'bad' : ''}"><td class="mono">${r.line}</td><td><b>${esc(r.dn)}</b> <span class="mono" style="font-size:11px;color:var(--faint)">${esc(r.dc)}</span></td><td>${r.uc ? `${esc(r.un)} <span class="mono" style="font-size:11px;color:var(--faint)">${esc(r.uc)}</span>` : '—'}</td>
        <td>${r.problems.length ? `<span class="pill bad">${esc(r.problems.join('、'))}</span>` : r.actions.map(x => `<span class="pill ${x === '無變更' ? '' : (x.startsWith('新增') ? 'good' : 'info')}" style="margin-right:4px">${esc(x)}</span>`).join('')}</td></tr>`).join('')}
      </tbody></table></div></div>` : '';
    body = `<div class="form-grid">
      <div class="field full"><span>選擇檔案</span><input type="file" accept=".csv,text/csv" data-file="orgcsv"><small>或直接貼入下方文字區。</small></div>
      <label class="field full"><span>CSV 內容</span><textarea data-field="text" rows="6" class="mono" placeholder="${esc(ORG_CSV_SAMPLE)}">${esc(d.text)}</textarea></label>
      ${d.parseError ? `<div class="form-err full">${esc(d.parseError)}</div>` : ''}
      ${preview}
    </div>`;
    foot = `<button class="btn-ghost" data-act="orgcsvsample">帶入範例</button><button class="btn-ghost" data-act="orgcsvparse">解析預覽</button><button class="btn-ghost" data-act="dlgcancel">${g.result ? '關閉' : '取消'}</button><button class="btn-primary" data-act="orgcsvimport">匯入</button>`;
  } else if (g.kind === 'api') {
    title = 'API 同步成員（altabots）'; sub = '以行內 SSO 登入 altabots 工作空間後，從工作空間成員名單同步成員、單位與角色；角色依規格 16.2 對應表映射';
    body = `<div class="form-grid">
      <label class="field full"><span>API 端點</span><input data-field="endpoint" class="mono" value="${esc(d.endpoint)}"></label>
      <label class="field full-2"><span>API Token <b>*</b></span><input data-field="token" type="password" value="${esc(d.token)}" placeholder="altabots 工作空間 → 設定 → API Token"></label>
      <label class="field"><span>同步模式</span><select data-field="mode">${opt('merge', d.mode, '合併（保留本地新增）')}${opt('replace', d.mode, '覆蓋（以 altabots 為準）')}</select></label>
      <div class="field full"><small>原型僅模擬結果，不實際呼叫；正式版由後端定時與 webhook 同步，停用、調單位、改角色在下次同步生效。</small></div>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">${g.result ? '關閉' : '取消'}</button><button class="btn-primary" data-act="apisync">立即同步</button>`;
  } else if (g.kind === 'agentapi') {
    title = '同步 AltaBots 工作空間 Agent'; sub = '自工作空間的 App 清單同步對練／評估 Agent、嵌入網址與可用角色；角色依規格 16.2 對應表映射';
    body = `<div class="form-grid">
      <label class="field full"><span>API 端點</span><input data-field="endpoint" class="mono" value="${esc(d.endpoint)}"></label>
      <label class="field full-2"><span>API Token <b>*</b></span><input data-field="token" type="password" value="${esc(d.token)}" placeholder="AltaBots 工作空間 → 設定 → API Token"></label>
      <label class="field"><span>同步模式</span><select data-field="mode">${opt('merge', d.mode, '合併（保留本地新增）')}${opt('replace', d.mode, '覆蓋（以 AltaBots 為準）')}</select></label>
      <div class="field full"><small>覆蓋模式下，工作空間已不存在但場景仍在使用的 Agent 會標記為停用而不刪除，避免對練中斷。原型僅模擬結果；正式版由後端定時與 webhook 同步。</small></div>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">${g.result ? '關閉' : '取消'}</button><button class="btn-primary" data-act="agentapisync">立即同步</button>`;
  } else if (g.kind === 'agent') {
    const rl = d.roles.split(',').filter(Boolean);
    title = d.id ? '編輯 Agent 對應' : '新增 Agent 對應'; sub = d.id ? `${d.id}${d.source === 'altabots' ? `　·　AltaBots 同步 ${d.synced}，手動修改會在下次同步被覆寫` : '　·　本地新增'}` : '手動登記工作空間尚未同步的 Agent';
    body = `<div class="form-grid">
      <label class="field full-2"><span>Agent 名稱 <b>*</b></span><input data-field="name" value="${esc(d.name)}" placeholder="altabots · 信貸電銷對練 Agent · 複訪 A1 · L2"></label>
      <label class="field"><span>類型</span><select data-field="kind">${opt('drill', d.kind, '對練 Agent（iframe）')}${opt('eval', d.kind, '評估 Agent（workflow）')}</select></label>
      ${d.kind === 'drill' ? `<label class="field full"><span>嵌入網址 <b>*</b></span><input data-field="src" class="mono" value="${esc(d.src)}" placeholder="https://agent.sinopac.ai/altabots/app/…/embed"></label>`
        : `<label class="field full"><span>workflow／端點 <b>*</b></span><input data-field="workflow" class="mono" value="${esc(d.workflow)}" placeholder="wf_credit_eval 或 https://…"></label>`}
      <label class="field"><span>建議場景類型</span><select data-field="cat">${Object.keys(CATS).map(k => opt(k, d.cat, CATS[k].short)).join('')}</select></label>
      <label class="field"><span>狀態</span><select data-field="status">${opt('on', d.status, '啟用')}${opt('off', d.status, '停用')}</select></label>
      <div class="field full"><span>可用角色 <b>*</b><small style="font-weight:400;color:var(--muted);margin-left:8px">系統擁有者與系統管理員不受限</small></span><div class="chks">${Object.keys(ROLES).filter(k => !ROLE_BYPASS.includes(k)).map(k => `<label class="chk"><input type="checkbox" data-field="roles" value="${k}" ${rl.includes(k) ? 'checked' : ''}><span class="pill" style="color:var(--blue);background:#EDF3FB">${esc(ROLES[k].cn)}</span></label>`).join('')}</div></div>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="agentsave">${d.id ? '儲存' : '建立'}</button>`;
  } else if (g.kind === 'scndel') {
    const blocked = d.enabled || d.sessions > 0;
    title = '刪除場景'; sub = `${d.name}　·　${d.id}`;
    body = `<div class="del-box">
      <div class="del-row"><span>狀態</span><b style="color:${d.enabled ? 'var(--red)' : '#1E9E63'}">${d.enabled ? '已啟用（須先停用）' : '未啟用'}</b></div>
      <div class="del-row"><span>對練記錄</span><b style="color:${d.sessions ? 'var(--red)' : '#1E9E63'}">${d.sessions} 筆${d.sessions ? '（有記錄不可刪除）' : ''}</b></div>
      <div class="del-row"><span>連帶刪除</span><b>客戶畫像 ${d.personas} 個、對練 Agent ${d.agents} 組、評估 Agent 設定</b></div>
      ${blocked ? `<div class="form-err" style="margin:12px 0 0">${d.enabled ? '此場景仍在使用中。請先在「編輯」把狀態改為未啟用，確認學員已不再進入後再刪除。' : '此場景已有對練記錄。為保留學員的歷史成績與複盤報告，系統不允許刪除，請改為停用。'}</div>`
        : `<div class="form-grid" style="margin-top:14px"><label class="field full"><span>請輸入場景名稱「${esc(d.name)}」以確認刪除 <b>*</b></span><input data-field="confirmName" value="${esc(d.confirmName || '')}" placeholder="${esc(d.name)}" autocomplete="off"></label></div>
           <div style="font-size:12px;color:var(--muted);margin-top:8px">此操作無法復原，會寫入操作記錄。</div>`}
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button>${blocked ? '' : `<button class="btn-primary danger" data-act="scndelconfirm">確認刪除</button>`}`;
  } else if (g.kind === 'diff') {
    title = d.code ? '編輯難度' : '新增難度'; sub = d.code ? d.code : '新增後可在場景類型與場景的難度集合勾選';
    body = `<div class="form-grid">
      ${d.code ? `<div class="field"><span>代碼</span><input value="${esc(d.code)}" disabled class="mono"></div>` : `<label class="field"><span>代碼 <b>*</b></span><input data-field="newCode" value="${esc(d.newCode || '')}" class="mono" placeholder="L4"></label>`}
      <label class="field"><span>名稱 <b>*</b></span><input data-field="cn" value="${esc(d.cn)}" placeholder="L4 極限"></label>
      <label class="field"><span>英文</span><input data-field="en" value="${esc(d.en)}" placeholder="Extreme"></label>
      <label class="field"><span>顏色</span><div style="display:flex;gap:8px;align-items:center"><input type="color" data-field="col" value="${esc(d.col)}" style="width:44px;padding:2px;height:36px"><span class="mono" style="font-size:12px">${esc(d.col)}</span></div></label>
      <label class="field full-2"><span>說明</span><input data-field="desc" value="${esc(d.desc)}" placeholder="客戶行為與考驗重點"></label>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="paramsave">${d.code ? '儲存' : '建立'}</button>`;
  } else if (g.kind === 'cat') {
    const dl = d.diffs.split(',').filter(Boolean);
    title = d.code ? '編輯場景類型' : '新增場景類型'; sub = d.code ? d.code : '新增後可在場景編輯的「場景類型」選擇';
    body = `<div class="form-grid">
      ${d.code ? `<div class="field"><span>代碼</span><input value="${esc(d.code)}" disabled class="mono"></div>` : `<label class="field"><span>代碼 <b>*</b></span><input data-field="newCode" value="${esc(d.newCode || '')}" class="mono" placeholder="wealth"></label>`}
      <label class="field"><span>名稱 <b>*</b></span><input data-field="short" value="${esc(d.short)}" placeholder="理財顧問"></label>
      <label class="field"><span>完整標籤</span><input data-field="label" value="${esc(d.label)}" placeholder="理財顧問 · Advisory"></label>
      <label class="field"><span>預設學員角色</span><input data-field="role" list="dl-roles" value="${esc(d.role)}"></label>
      <label class="field"><span>預設評分規則</span><select data-field="schema">${Object.keys(SCHEMAS).map(k => opt(k, d.schema, SCHEMAS[k].name)).join('')}</select></label>
      <div class="field full"><span>可用難度集合 <b>*</b><small style="font-weight:400;color:var(--muted);margin-left:8px">此類型的場景只能在這些難度中勾選；取消仍有場景使用的難度會被擋下</small></span><div class="chks">${Object.keys(DIFF).map(k => `<label class="chk"><input type="checkbox" data-field="diffs" value="${k}" ${dl.includes(k) ? 'checked' : ''}><span class="pill" style="color:${DIFF[k].col};background:${DIFF[k].col}1f">${esc(DIFF[k].cn)}</span></label>`).join('')}</div></div>
    </div>${personaDatalists()}`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="paramsave">${d.code ? '儲存' : '建立'}</button>`;
  } else if (g.kind === 'schema') {
    title = d.code ? '編輯評分規則' : '新增評分規則'; sub = d.code ? d.code : '新增後可在場景的評估 Agent 選用';
    body = `<div class="form-grid">
      ${d.code ? `<div class="field"><span>代碼</span><input value="${esc(d.code)}" disabled class="mono"></div>` : `<label class="field"><span>代碼 <b>*</b></span><input data-field="newCode" value="${esc(d.newCode || '')}" class="mono" placeholder="wealth5"></label>`}
      <label class="field full-2"><span>名稱 <b>*</b></span><input data-field="name" value="${esc(d.name)}" placeholder="理財五維"></label>
      <label class="field full"><span>評分維度 <b>*</b></span><textarea data-field="dimsText" rows="5" placeholder="每行一個，例如：&#10;合規規範 / Compliance&#10;專業知識 / Expertise">${esc(d.dimsText)}</textarea><small>每行一個維度，可用「中文 / English」。</small></label>
      <label class="chk full" style="gap:8px"><input type="checkbox" data-field="veto" ${d.veto ? 'checked' : ''}><span>法遵檢核表一票否決</span><small style="color:var(--muted)">任一項不符合即判定未通過</small></label>
      <label class="field full"><span>說明</span><textarea data-field="desc" rows="2">${esc(d.desc)}</textarea></label>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="paramsave">${d.code ? '儲存' : '建立'}</button>`;
  } else if (g.kind === 'role') {
    const chk = (key, label, hint) => `<label class="chk" style="gap:8px"><input type="checkbox" data-field="${key}" ${d[key] ? 'checked' : ''}><span>${label}</span><small style="color:var(--muted)">${hint}</small></label>`;
    title = d.code ? '編輯角色' : '新增角色'; sub = d.code ? `${d.code}${d.builtin ? '　·　內建角色，可改名稱與權限' : ''}` : '新增的角色會立即出現在成員表單的角色下拉選單';
    body = `<div class="form-grid">
      <label class="field full-2"><span>角色名稱 <b>*</b></span><input data-field="cn" value="${esc(d.cn)}" placeholder="例：電銷部長、資訊維護者"></label>
      ${d.code ? `<div class="field"><span>角色代碼</span><input value="${esc(d.code)}" disabled class="mono"></div>` : `<label class="field"><span>角色代碼（選填）</span><input data-field="newCode" value="${esc(d.newCode || '')}" class="mono" placeholder="自動產生"></label>`}
      <label class="field"><span>資料範圍</span><select data-field="scope">${opt('all', d.scope, '全行')}${opt('team', d.scope, '本人與下屬')}${opt('self', d.scope, '僅本人')}</select></label>
      <div class="field full"><span>數據報表與系統設定</span><div class="chks" style="flex-direction:column;align-items:flex-start;gap:8px">
        ${chk('insights', '洞察分析', '團隊洞察、人員排行')}${chk('stats', '對練統計', '場景內主管模組')}${chk('scenarioSettings', '場景設定', '維護場景、客戶畫像與 Agent')}${chk('settings', '系統設定（全部）', '含成員權限與操作記錄')}
      </div><small>我的數據永遠可見，範圍依資料範圍；複盤報告的可見範圍同資料範圍。</small></div>
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="rolesave">${d.code ? '儲存' : '建立角色'}</button>`;
  } else if (g.kind === 'org') {
    const lvl = ['事業群', '處', '單位'][d.depth] || '單位';
    title = d.mode === 'add' ? `新增${lvl}` : `編輯${lvl}`; sub = d.mode === 'add' ? `上層：${d.parentName}` : (d.code || '');
    body = `<div class="form-grid">
      <label class="field full-2"><span>名稱 <b>*</b></span><input data-field="name" value="${esc(d.name)}"></label>
      <label class="field"><span>代碼 <b>*</b></span><input data-field="code" class="mono" value="${esc(d.code)}" placeholder="${d.depth === 1 ? 'DIV-14' : 'U-141'}"></label>
      ${d.mode === 'edit' && d.depth === 2 ? `<label class="field full"><span>所屬處（可移動）</span><select data-field="parent">${d.parents.map(p => opt(p.id, d.parent, p.name)).join('')}</select></label>` : ''}
    </div>`;
    foot = `<button class="btn-ghost" data-act="dlgcancel">取消</button><button class="btn-primary" data-act="orgsave">儲存</button>`;
  }
  return `<div class="modal-bg" data-act="dlgcancel"><div class="modal form" data-act="noop">
    <div class="form-hd"><div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><button class="x" data-act="dlgcancel" aria-label="關閉">${svg(I.back, 16)}</button></div>
    ${err}${ok}${body}<div class="form-ft">${foot}</div></div></div>`;
}

/* ------------------------------------------------------------------ 場景中心 */
function viewHub() {
  const q = S.hubSearch.trim().toLowerCase();
  const list = SCENARIOS.filter(s => SCENARIO_META[s.id].status === 'on')
    .filter(s => S.hubCat === 'all' || s.cat === S.hubCat)
    .filter(s => !q || (s.cn + s.desc + s.catCn + s.en).toLowerCase().includes(q));

  // 分類直接由啟用中的場景推導，避免寫死的清單漏掉像「信貸業務」這種後加的分類
  const catMap = new Map();
  SCENARIOS.filter(s => SCENARIO_META[s.id].status === 'on')
    .forEach(s => { if (!catMap.has(s.cat)) catMap.set(s.cat, s.catCn.split(' · ')[0]); });
  const cats = [{ id: 'all', label: '全部場景' }]
    .concat([...catMap].map(([id, label]) => ({ id, label })))
    .map(c => `<button class="${S.hubCat === c.id ? 'on' : ''}" data-act="hubcat" data-arg="${c.id}">${esc(c.label)}</button>`).join('');

  const cards = list.map(s => {
    const n = sessionsFor(s.id).length;
    return `<button class="card sc-card" data-act="goto" data-arg="#/s/${s.id}/records">
      <div class="hd">
        <div class="ic" style="background:${s.tint}">${iconFor(s)}</div>
        <h3>${esc(s.cn)}</h3>
        <span class="cat">${esc(s.catCn.split(' · ')[0])}</span>
      </div>
      <div class="desc">${esc(s.desc)}</div>
      <div class="ft">
        <div class="chips">
          <span class="chip">${esc(s.youRole.cn)}</span>
          <span class="chip">${s.personas.length} 個客戶畫像</span>
          ${n ? `<span class="chip red">${n} 筆記錄</span>` : ''}
        </div>
        <span class="go">進入 ${svg(I.arrow, 15)}</span>
      </div>
    </button>`;
  }).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>場景中心</h1><p>選擇一個工作場景，直接進入對練。</p></div>
    <div class="filters">
      <div class="seg">${cats}</div>
      <div class="inp" style="margin-left:auto">${svg(I.search, 15)}
        <input placeholder="搜尋場景…" data-act="hubsearch" data-keep-focus="hubsearch" value="${esc(S.hubSearch)}"></div>
    </div>
    ${list.length ? `<div class="grid3">${cards}</div>` : `<div class="card empty">找不到符合「${esc(S.hubSearch)}」的場景</div>`}
  </div>`;
}

function iconFor(s) {
  // the scenario icons in data.js are raw <svg> strings
  return s.icon.replace('<svg ', '<svg style="display:block" ');
}

/* ------------------------------------------------------------------ 場景：對練記錄 */
function viewRecords(sc) {
  const full = ROLES[S.user.role].scope !== 'self';
  const q = S.recSearch.trim().toLowerCase();
  const inR = sessionsFor(sc.id).filter(inRange);
  const rows = inR.filter(r =>
    !q || (r.pe + r.id + (memberById(r.member) || {}).name).toLowerCase().includes(q));

  const head = full
    ? '<th>對練時間</th><th>客戶畫像</th><th>難度</th><th>對練ID</th><th>理專</th><th>所屬單位</th><th>時長</th><th class="num">狀態／得分</th>'
    : '<th>對練時間</th><th>客戶畫像</th><th>難度</th><th>對練ID</th><th>時長</th><th class="num">狀態／得分</th>';

  const body = rows.map(r => {
    const m = memberById(r.member) || {};
    const d = DIFF[r.diff];
    const pr0 = sessionPass(r);
    const status = r.status === 'done'
      ? `<b class="mono" style="color:${scoreCol(r.score)};font-size:14px">${r.score}</b>
         <span class="pill" style="color:${scoreCol(r.score)};background:${scoreCol(r.score)}1f;margin-left:7px">${grade(r.score)}</span>
         <span class="pill ${pr0.pass ? 'good' : 'bad'}" style="margin-left:5px" title="${esc(pr0.why)}">${pr0.pass ? '通過' : '未通過'}</span>`
      : r.status === 'evaluating'
        ? `<button class="pill-btn" data-act="rescore" data-arg="${r.id}" title="若 workflow 未成功觸發，點擊重新觸發評分"><span class="spin" style="width:11px;height:11px;border-width:2px"></span>正在評估中 · 重新觸發</button>`
        : `<span class="pill" style="color:#667085;background:#F4F7F8" title="${esc(r.failReason || '')}">暫無評分${r.failReason ? ' · 逾時' : ''}</span> <button class="btn-ghost sm" data-act="rescore" data-arg="${r.id}" title="${esc(r.failReason || '重新評分')}">↻ 重新評分</button>`;
    const mid = full
      ? `<td>${esc(m.name || '—')}</td><td>${esc(UNITS[m.unit] || '—')}</td>`
      : '';
    return `<tr class="clickable" data-act="goto" data-arg="#/s/${sc.id}/report/${r.id}">
      <td class="mono">${esc(r.date)}</td>
      <td><b>${esc(r.pe)}</b></td>
      <td><span class="pill" style="color:${d.col};background:${d.col}1f">${d.cn}</span></td>
      <td class="mono" style="color:var(--muted);font-size:12px">${esc(r.id)}</td>
      ${mid}
      <td class="mono">${esc(r.dur)}</td>
      <td class="num">${status}</td>
    </tr>`;
  }).join('');

  const target = targetFor(sc.id); const prAll = passRate(inR); const prMine = passRate(inR.filter(r => r.member === S.user.id));
  const avgR = (() => { const d = inR.filter(r => r.status === 'done'); return d.length ? (d.reduce((x, y) => x + y.score, 0) / d.length).toFixed(1) : '—'; })();
  const prStrip = `<div class="pr-strip">
      <div><span class="l">區間場次</span><b>${inR.length}</b><span class="s">已評分 ${inR.filter(r => r.status === 'done').length}・平均 ${avgR}</span></div>
      <div><span class="l">${full ? '可視範圍通過率' : '我的通過率'}</span><b style="color:${prCol(full ? prAll : prMine, target)}">${passRateText(full ? prAll : prMine)}</b><span class="s">${esc(passRateSub(full ? prAll : prMine, target))}</span></div>
      ${full && prMine.n ? `<div><span class="l">我的通過率</span><b style="color:${prCol(prMine, target)}">${passRateText(prMine)}</b><span class="s">${esc(passRateSub(prMine, target))}</span></div>` : ''}
      <div class="hint">通過率 = 通過次數 ÷ 全部對練次數；單場判定：${(() => { const ev = ensureEval(sc.id); return ev.pass === 'score' ? `分數 ≥ ${ev.passScore}` : '達成成交訊號'; })()}${ensureEval(sc.id).veto ? '，法遵一票否決' : ''}。目標可在參數設定調整。</div>
    </div>`;
  return `<div class="wrap">
    <div class="page-h"><h1>對練記錄</h1><p>${esc(sc.desc)}</p></div>
    ${viewRangeBar()}
    ${prStrip}
    <div class="filters">
      <button class="btn-primary" data-act="goto" data-arg="#/s/${sc.id}/new">${svg(I.play, 16)}發起對練</button>
      <div class="inp" style="margin-left:auto">${svg(I.search, 15)}
        <input placeholder="搜尋客戶畫像或對練ID…" data-act="recsearch" data-keep-focus="recsearch" value="${esc(S.recSearch)}"></div>
    </div>
    <div class="card">
      ${rows.length ? `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
                    : '<div class="empty">這個場景還沒有對練記錄。按「發起對練」開始第一場。</div>'}
      <div class="tbl-foot">共 ${rows.length} 筆（${esc(rangeBounds().text)}）　·　${esc(scopeLabel(S.user))}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 場景：發起對練 */
function curPersona(sc) {
  return sc.personas.find(p => p.id === S.personaId) || sc.personas[0];
}

function viewNew(sc) {
  const sel = curPersona(sc);
  const personas = sc.personas.map(p => {
    const d = DIFF[p.diff];
    return `<button class="persona-card ${p.id === sel.id ? 'on' : ''}" data-act="pickpersona" data-arg="${p.id}">
      <span class="tick">${svg(I.check, 13)}</span>
      <div class="hd"><div class="av" style="background:${p.col}">${esc(p.init)}</div>
        <div><div class="nm">${esc(p.name)}</div></div></div>
      <div class="tags">
        <span class="pill" style="color:${p.col};background:${p.col}1f">${esc(p.risk)}</span>
        <span class="pill" style="color:${d.col};background:${d.col}1f">${d.cn}難度</span>
      </div>
      <div class="mood">情緒狀態 · ${esc(p.mood)}</div>
      <div class="temper">${esc(p.temper)}</div>
    </button>`;
  }).join('');

  const diffs = (sc.diffs || Object.keys(DIFF)).map(k => {
    const d = DIFF[k], on = S.difficulty === k;
    return `<button class="diff-card" data-act="pickdiff" data-arg="${k}"
      style="${on ? `background:${d.col}12;border-color:${d.col}` : ''}">
      <div class="hd"><span class="dot" style="background:${d.col};box-shadow:0 0 0 3px ${d.col}33"></span>
        <span class="cn" style="color:${on ? d.col : 'var(--ink2)'}">${d.cn}</span>
        <span class="en">${d.en}</span></div>
      <div class="desc" style="${on ? 'color:var(--body)' : ''}">${esc(d.desc)}</div>
    </button>`;
  }).join('');

  const sd = DIFF[S.difficulty];
  return `<div class="wrap">
    <div class="page-h"><h1>發起對練</h1><p>你的角色：<b>${esc(sc.youRole.cn)}</b>　·　預計時長 ${esc(sc.duration)}</p></div>
    ${(() => { const g = agentFor(sc.id, sel.id, S.difficulty); if (!(g && g.status === 'on' && g.embed)) return `<div class="agent-note warn">${svg(I.warn, 14)} 此客戶畫像 × 難度尚未配置啟用中的對練 Agent，將以示範對話進行；請管理員至系統設定 → 場景設定配置。</div>`;
      const ls = agentLinkState(g); const roleOk = !ls.a || roleCanUseAgent(S.user.role, ls.a);
      if (ls.a && ls.level === 'bad') return `<div class="agent-note bad">${svg(I.warn, 14)} 對練 Agent <b>${esc(g.name)}</b> 目前不可用：${esc(ls.text)}。請聯絡管理員至 成員權限 › Agent 對應 同步或調整。</div>`;
      if (!roleOk) return `<div class="agent-note bad">${svg(I.warn, 14)} 你的角色「${esc(ROLES[S.user.role].cn)}」不在對練 Agent <b>${esc(g.name)}</b> 的可用角色內（AltaBots 工作空間設定：${esc(ls.a.roles.map(r => ROLES[r] ? ROLES[r].cn : r).join('、'))}）。請聯絡管理員調整角色對應。</div>`;
      return `<div class="agent-note ok">${svg(I.check, 14)} 對練 Agent：<b>${esc(g.name || '未命名')}</b>　<span class="mono">${esc(embedSrc(g.embed))}</span>${ls.a ? `　<span class="pill good" title="${esc(ls.text)}">AltaBots 已對應</span>` : '　<span class="pill" style="color:#E0882E;background:#FDF3E7" title="不在對應清單，未檢核角色">未對應</span>'}</div>`; })()}
    <h2 style="font-family:'Noto Sans TC';font-size:16px;font-weight:700;margin-bottom:14px">選擇客戶畫像</h2>
    <div class="grid3" style="margin-bottom:28px">${personas}</div>
    <h2 style="font-family:'Noto Sans TC';font-size:16px;font-weight:700;margin-bottom:6px">調整對練難度</h2>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">預設沿用客戶畫像的難度，可依訓練目標調整。</p>
    <div class="diff-row">${diffs}</div>
    <div class="actionbar">
      <div class="fields">
        <div class="f"><div class="l">客戶畫像</div><div class="v">${esc(sel.name)}</div></div>
        <div class="vr"></div>
        <div class="f"><div class="l">難度</div><div class="v" style="color:${sd.col}">${sd.cn}</div></div>
      </div>
      ${(() => { const g = agentFor(sc.id, sel.id, S.difficulty); const ls = g ? agentLinkState(g) : { a: null }; const blocked = g && g.status === 'on' && g.embed && ls.a && (ls.level === 'bad' || !roleCanUseAgent(S.user.role, ls.a));
        return `<button class="btn-primary" data-act="startcall" ${blocked ? 'disabled title="此 Agent 對你的角色不可用"' : ''}>${svg(I.play, 17)}開始對練</button>`; })()}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 場景：對練中 */
function viewCall(sc) {
  const p = curPersona(sc);
  const sd = DIFF[S.difficulty];
  const g = agentFor(sc.id, p.id, S.difficulty);
  const agentName = (g && g.name) || '永豐對練 Agent';
  const src = g ? embedSrc(g.embed) : '';
  const phase = S.callPhase || 'ready';
  const shortP = p.name.split('·').pop().trim();
  const statusCn = { ready: '未開始', live: '通話中', ended: '已結束' }[phase];

  const modal = S.confirmEnd ? `<div class="modal-bg">
    <div class="modal">
      <div class="ic" style="color:var(--red)">${svg(I.warn, 22)}</div>
      <h3>${phase === 'ended' ? '通話已結束，送出評分？' : '結束本次對練？'}</h3>
      <p>${phase === 'ended' ? 'Agent 已回傳逐字稿與錄音。送出後建立對練記錄並由評估 Agent 評分。' : '結束後將通知 Agent 結束通話，生成對練記錄並開始評分。'}</p>
      <div class="row">
        <button class="btn-ghost" data-act="cancelend" style="justify-content:center">${phase === 'ended' ? '稍後再送' : '繼續對練'}</button>
        <button data-act="doend" style="background:linear-gradient(145deg,#E5342B,#C00E1A);color:#fff">結束對練並評分</button>
      </div>
    </div></div>` : '';

  // 模擬 AltaBots 對練 Agent 的 iframe 通話頁：頭像、Agent 名稱、場景／人設副標、開始語音通話；通話中顯示狀態與結束通話
  const frameBody = phase === 'ready'
    ? `<button class="cf-call" data-act="iframecall">${svg(I.phone, 16)}開始語音通話</button>`
    : phase === 'live'
      ? `<div class="cf-wave"><i></i><i></i><i></i><i></i><i></i></div><div class="cf-status">通話中 · ${fmt(S.elapsed)}</div><button class="cf-hang" data-act="iframehang">${svg(I.phone, 16)}結束通話</button>`
      : `<div class="cf-status">通話已結束 · ${fmt(S.elapsed)}</div><small class="cf-hint">逐字稿與錄音已回傳本系統，請按右上「結束對練並評分」。</small>`;

  return `<div class="call">
    <div class="call-top">
      <div class="l">
        <button class="call-back" data-act="askend">${svg(I.back, 16)}返回</button>
        <span class="call-status ${phase}"><i></i>${statusCn}</span>
        <span style="font-size:12.5px;color:#9FC4BD">${esc(sc.cn)} · ${esc(shortP)}</span>
      </div>
      <div class="call-timer">${fmt(S.elapsed)}</div>
      <div class="r"><span style="font-size:12px;color:#7FA59E">難度 <b style="color:#EAF2F1">${sd.cn}</b></span>
        <button class="call-end-btn" data-act="askend">結束對練並評分</button></div>
    </div>
    <div class="call-frame-wrap">
      <div class="call-frame" title="${esc(src || '尚未配置 Agent，以示範畫面進行')}">
        <div class="cf-chrome"><span class="cf-dot"></span><span class="cf-dot"></span><span class="cf-dot"></span><span class="cf-src mono">${esc(src || 'altabots · 示範通話頁')}</span><span class="cf-badge">iframe</span></div>
        <div class="cf-body ${phase}">
          <div class="cf-avatar">${phase === 'live' ? '<span class="avatar-ring"></span><span class="avatar-ring b"></span>' : ''}
            <div class="cf-face"><svg width="60" height="60" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="24" r="12" fill="#F2D3B8"/><path d="M20 20c0-8 24-8 24 0v4c0 1-1 2-2 2H22c-1 0-2-1-2-2v-4z" fill="#2B2B2B"/><rect x="21" y="23" width="9" height="7" rx="3.5" stroke="#2B2B2B" stroke-width="1.6"/><rect x="34" y="23" width="9" height="7" rx="3.5" stroke="#2B2B2B" stroke-width="1.6"/><path d="M30 26.5h4" stroke="#2B2B2B" stroke-width="1.6"/><path d="M12 56c0-11 9-18 20-18s20 7 20 18v4H12v-4z" fill="#2F4A8A"/><path d="M26 36l6 6 6-6" stroke="#fff" stroke-width="1.6"/></svg></div>
          </div>
          <b class="cf-name">${esc(agentName)}</b>
          <small class="cf-sub">${esc(sc.cn)}-${esc(shortP)}（ASR+LLM+TTS）</small>
          ${frameBody}
        </div>
      </div>
      <div class="call-note">通話介面由 AltaBots 對練 Agent 以 iframe 提供，本系統只提供外框（計時、狀態、結束對練並評分）。逐字稿與錄音於通話結束後由 Agent 回傳，供複盤報告的記錄詳情與回放使用。</div>
    </div>
    ${modal}
  </div>`;
}

/* ------------------------------------------------------------------ 場景：複盤報告 */
function viewReport(sc, sessionId) {
  const session = SESSIONS.find(s => s.id === sessionId);
  if (!session) return `<div class="wrap"><div class="card empty">找不到這筆對練記錄。</div></div>`;

  const rc = reportFor(sc.id);
  const evaluating = session.status === 'evaluating' || session.status === 'no_score';
  const overall = session.score == null ? 0 : session.score;
  const d = DIFF[session.diff] || DIFF.L2;
  const m = memberById(session.member) || S.user;
  const C = 2 * Math.PI * 68;
  const allLines = transcriptFor(sc.id).slice(0, session.reveal || undefined);
  const compliance = session.compliance != null ? session.compliance : allLines.filter(l => l.flag === 'compliance').length;
  const words = session.words != null ? session.words : allLines.reduce((n, l) => n + l.t.replace(/\s/g, '').length, 0);
  const dimsSrc = session.dims || rc.dims;

  const dims = dimsSrc.map(x => `<div class="dim">
    <div class="hd"><div><span class="cn">${esc(x.cn)}</span><span class="en">${esc(x.en)}</span></div>
      <span class="sc" style="color:${scoreCol(x.score)}">${x.score}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${x.score}%;background:linear-gradient(90deg,${scoreCol(x.score)}99,${scoreCol(x.score)})"></div></div>
    <div class="note">${esc(x.note)}</div></div>`).join('');

  const rp = replayFor(session); const rl = replayLines(sc.id); const total = replayTotal(session, rl); const actIdx = activeLineIdx(rl, rp.time);
  const shownCount = session.reveal || rl.length;
  const lines = rl.slice(0, shownCount).map((l, i) => `<div class="replay-line ${i === actIdx ? 'on' : ''}" data-act="replayseek" data-arg="${l.at}">
      <span class="t mono">${fmt(l.at)}</span>
      <span class="sp" style="color:${l.who === 'cust' ? 'var(--ink2)' : 'var(--blue)'}">${l.who === 'cust' ? esc(session.pe.split('·').pop().trim()) : esc(m.name)}</span>
      <span class="tx">${esc(l.text)}</span>${l.who === 'cust' ? '' : `<span class="who-tag">你</span>`}</div>`).join('');
  const voiceOk = 'speechSynthesis' in window;
  const replayCtl = `<div class="replay-ctl">
      <button class="rp-btn ${rp.playing ? 'on' : ''}" data-act="replaytoggle" aria-label="${rp.playing ? '暫停' : '播放'}">${rp.playing ? '<span class="pause"><i></i><i></i></span>' : svg(I.play, 18)}</button>
      <div class="rp-track" data-act="replaybar" id="rp-track"><div class="rp-fill" id="rp-fill" style="width:${(rp.time / total * 100).toFixed(1)}%"></div></div>
      <span class="mono rp-time"><span id="rp-cur">${fmt(Math.floor(rp.time))}</span> / ${fmt(Math.floor(total))}</span>
      <button class="rp-voice ${rp.voice ? 'on' : ''}" data-act="replayvoice" title="${voiceOk ? '以瀏覽器語音朗讀逐字稿' : '此瀏覽器不支援語音朗讀'}" ${voiceOk ? '' : 'disabled'}>${svg(I.globe, 14)} ${rp.voice ? '朗讀中' : '靜音'}</button>
      <span class="rp-dot ${rp.playing ? 'on' : ''}"></span><span style="font-size:11.5px;color:var(--muted)">${rp.playing ? '回放中' : '錄音回放'}</span>
    </div>`;
  const ev = ensureEval(sc.id); const schema = SCHEMAS[ev.schema];
  const evalHero = evaluating ? `<div class="eval-box"><span class="spin"></span><div style="flex:1"><b>評估 Agent 評分中…</b><div class="sub">${esc(ev.name)}（${esc(schema ? schema.name : ev.schema)}）正依評分規則逐句分析，約需數秒；完成後本頁自動更新。</div></div><button class="btn-ghost sm" data-act="rescore" data-arg="${session.id}">重新觸發</button></div>`
    : session.status === 'no_score' ? `<div class="eval-box fail"><span>⚠</span><div style="flex:1"><b>評分未完成</b><div class="sub">${esc(session.failReason || '評估 Agent 未回傳結果')}</div></div><button class="btn-primary" data-act="rescore" data-arg="${session.id}">重新觸發評分</button></div>` : '';

  return `<div class="wrap">
    <div class="card report-hero" style="margin-bottom:18px">
      <div class="meta">
        <h1>對練複盤報告</h1>
        <div class="chips">
          <span class="chip">${esc(sc.cn)}</span>
          <span class="chip">客戶：${esc(session.pe)}</span>
          <span class="chip" style="color:${d.col};background:${d.col}1f;border-color:${d.col}33">${d.cn}難度</span>
          <span class="chip">理專：${esc(m.name)}</span>
          <span class="chip" title="評估 Agent">評估：${esc(ev.name)}</span>
        </div>
        <div class="stats">
          <div><div class="v">${esc(session.dur)}</div><div class="l">對練時長</div></div>
          <div><div class="v">${words.toLocaleString()}</div><div class="l">對話字數</div></div>
          <div><div class="v" style="color:${compliance ? 'var(--red)' : '#1E9E63'}">${compliance}</div><div class="l">合規提醒</div></div>
          ${(() => { const pr = sessionPass(session); return `<div><div class="v" style="font-size:16px;color:${evaluating ? 'var(--muted)' : (pr.pass ? '#1E9E63' : 'var(--red)')}">${evaluating ? '—' : (pr.pass ? '通過' : '未通過')}</div><div class="l" title="${esc(pr.why)}">通關判定・${esc(pr.why)}</div></div>`; })()}
          <div><div class="v" style="font-size:14px;color:var(--muted)">${esc(session.date)}</div><div class="l">完成時間</div></div>
        </div>
      </div>
      <div class="ring-wrap ${evaluating ? 'pending' : ''}">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="68" fill="none" stroke="var(--line2)" stroke-width="11"/>
          ${evaluating ? '' : `<circle cx="75" cy="75" r="68" fill="none" stroke="${scoreCol(overall)}" stroke-width="11" stroke-linecap="round"
            stroke-dasharray="${(C * overall / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 75 75)"/>`}
        </svg>
        <div class="num">${evaluating ? `<span class="spin big"></span><s style="margin-top:8px">評分中</s>` : `<b style="color:${scoreCol(overall)}">${overall}</b><s>／100</s>
          <s style="color:${scoreCol(overall)};font-weight:700;margin-top:6px">${grade(overall)}</s>`}</div>
      </div>
    </div>
    ${evalHero}

    ${evaluating ? '' : `<div class="grid2" style="margin-bottom:18px;align-items:start">
      <div class="card"><div class="card-h"><h2>能力維度評分</h2><div class="sub">${esc(schema ? schema.name : 'COMPETENCY BREAKDOWN')}</div></div>
        <div class="card-b">${dims}</div></div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="list-good"><h3>${svg(I.check, 16)}表現亮點</h3><ul>${rc.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="list-bad"><h3>${svg(I.warn, 16)}待提升項</h3><ul>${rc.improves.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
    </div>`}

    <div class="card"><div class="card-h"><h2>記錄詳情</h2><div class="sub">AUDIO TRANSCRIPT　·　點任一句可跳至該時間點</div></div>
      <div class="card-b" id="replay-lines">${lines}</div>
      ${replayCtl}</div>

    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="btn-ghost" data-act="goto" data-arg="#/s/${sc.id}/records">返回對練記錄</button>
      <button class="btn-primary" data-act="goto" data-arg="#/s/${sc.id}/new">${svg(I.play, 16)}再次對練</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 場景：統計（主管模組） */
function viewScenarioStats(sc) {
  const rows = sessionsFor(sc.id).filter(inRange);
  const done = rows.filter(r => r.status === 'done');
  const avg = done.length ? (done.reduce((a, b) => a + b.score, 0) / done.length) : 0;
  const rb = rangeBounds();

  const byPersona = {};
  rows.forEach(r => { byPersona[r.pe] = (byPersona[r.pe] || 0) + 1; });
  const maxP = Math.max(1, ...Object.values(byPersona));
  const personaBars = Object.entries(byPersona).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v}</span></div>
     <div class="bar-track"><div class="bar-fill" style="width:${v / maxP * 100}%;background:linear-gradient(90deg,#EE6A60,#D81E26)"></div></div></div>`).join('');

  const byMember = {}; const byMemberRows = {};
  rows.forEach(r => { const n = (memberById(r.member) || {}).name || '—'; byMember[n] = (byMember[n] || 0) + 1; (byMemberRows[n] = byMemberRows[n] || []).push(r); });
  const maxM = Math.max(1, ...Object.values(byMember)); const tgt = targetFor(sc.id);
  const memberBars = Object.entries(byMember).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v} 次・<b style="color:${prCol(passRate(byMemberRows[k]), tgt)}">通過 ${passRateText(passRate(byMemberRows[k]))}</b></span></div>
     <div class="bar-track"><div class="bar-fill" style="width:${v / maxM * 100}%;background:linear-gradient(90deg,#3CC0B4,#009E96)"></div></div></div>`).join('');

  const recent = rows.slice(0, 6).map(r => {
    const m = memberById(r.member) || {};
    return `<tr><td class="mono" style="font-size:12px;color:var(--muted)">${esc(r.id)}</td>
      <td>${esc(r.pe)}</td><td>${esc(m.name || '—')}</td><td class="mono">${esc(r.date)}</td>
      <td class="num">${r.status === 'done' ? `<b class="mono" style="color:${scoreCol(r.score)}">${r.score}</b>` : '—'}</td></tr>`;
  }).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>對練統計 <span class="tag-mgr">主管模組</span></h1><p>${esc(sc.desc)}</p></div>
    <div class="scope-note">${esc(scopeLabel(S.user))}</div>
    ${viewRangeBar()}
    <div class="kpis" style="grid-template-columns:repeat(5,1fr)">
      ${kpi('練', '對練場次', rows.length, rb.text, '#D81E26')}
      ${kpi('完', '已完成', done.length, `待評 ${rows.length - done.length}`, '#1E9E63')}
      ${kpi('分', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 份評分`, '#E0882E')}
      ${(() => { const pr = passRate(rows); const t = targetFor(sc.id); return kpi('過', '通過率', passRateText(pr), passRateSub(pr, t), prCol(pr, t)); })()}
      ${kpi('人', '參與人數', new Set(rows.map(r => r.member)).size, '有對練記錄', '#2D6CC0')}
    </div>
    <div class="grid2 dash-row" style="margin-bottom:18px">
      <div class="card"><div class="card-h"><h2>客戶畫像分布</h2><div class="sub">共 ${rows.length} 筆</div></div><div class="card-b">${personaBars || '<div class="empty">尚無資料</div>'}</div></div>
      <div class="card"><div class="card-h"><h2>理專分布</h2><div class="sub">共 ${rows.length} 筆</div></div><div class="card-b">${memberBars || '<div class="empty">尚無資料</div>'}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>最近對練</h2><div class="sub">${esc(rb.text)} 內的對練場次</div></div>
      ${rows.length ? `<table class="tbl" style="margin-top:12px"><thead><tr><th>對練編號</th><th>客戶畫像</th><th>理專</th><th>發起日期</th><th class="num">得分</th></tr></thead><tbody>${recent}</tbody></table>` : '<div class="empty">尚無資料</div>'}
    </div>
  </div>`;
}

function kpi(badge, label, value, sub, col) {
  return `<div class="kpi"><div class="k"><i style="background:${col}">${badge}</i>${esc(label)}</div>
    <div class="v">${esc(value)}</div><div class="s">${esc(sub)}</div></div>`;
}

/* ------------------------------------------------------------------ 我的數據 */
function viewMe() {
  const allMine = SESSIONS.filter(s => s.member === S.user.id);
  const mine = allMine.filter(inRange);
  const done = mine.filter(s => s.status === 'done');
  const avg = done.length ? (done.reduce((x, y) => x + y.score, 0) / done.length) : 0;
  const prMine = passRate(mine); const rb = rangeBounds();
  const minutes = mine.reduce((n, r) => n + sessionMinutes(r), 0);
  const trend = trendSeries(mine);
  const scPassRows = SCENARIOS.filter(s => mine.some(r => r.sc === s.id)).map(s => {
    const pr = passRate(mine.filter(r => r.sc === s.id)); const t = targetFor(s.id); const ev = ensureEval(s.id);
    return `<tr class="clickable" data-act="goto" data-arg="#/s/${s.id}/records"><td><b>${esc(s.cn)}</b></td><td style="font-size:12px;color:var(--body)">${ev.pass === 'score' ? `分數 ≥ ${ev.passScore}` : '達成成交訊號'}${ev.veto ? '・法遵否決' : ''}</td><td class="num mono">${pr.n}</td><td class="num mono">${pr.k}</td><td class="num"><b class="mono" style="color:${prCol(pr, t)}">${passRateText(pr)}</b></td><td class="num mono">${t}%</td><td>${pr.pct == null ? '—' : pr.pct >= t ? '<span class="pill good">已達標</span>' : `<span class="pill bad">差 ${t - pr.pct}%</span>`}</td></tr>`;
  }).join('');

  const W = 760, H = 250, padL = 40, padR = 20, padTop = 20, padBot = 34, n = trend.length;
  const xs = i => n === 1 ? (padL + (W - padL - padR) / 2) : padL + i * ((W - padL - padR) / (n - 1));
  const ys = v => padTop + (1 - (Math.max(50, Math.min(100, v)) - 50) / 50) * (H - padTop - padBot);
  const grid = [60, 70, 80, 90, 100].map(v => `<line x1="${padL}" y1="${ys(v).toFixed(1)}" x2="${W - padR}" y2="${ys(v).toFixed(1)}" stroke="#EDF1F2"/><text x="${padL - 8}" y="${(ys(v) + 3.5).toFixed(1)}" fill="#A3AEB5" font-size="10" text-anchor="end">${v}</text>`).join('');
  const pts = trend.map((t, i) => [xs(i), ys(t.v)]);
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = n > 1 ? `M${pts[0][0].toFixed(1)},${H - padBot} ` + pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${pts[n - 1][0].toFixed(1)},${H - padBot} Z` : '';
  const dots = trend.map((t, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(t.v).toFixed(1)}" r="3.6" fill="#fff" stroke="#D81E26" stroke-width="2"/>
    <text x="${xs(i).toFixed(1)}" y="${ys(t.v) - 9}" fill="#D81E26" font-size="10" font-weight="700" text-anchor="middle">${t.v}</text>
    ${n <= 12 || i % Math.ceil(n / 12) === 0 ? `<text x="${xs(i).toFixed(1)}" y="${H - padBot + 18}" fill="#7C8992" font-size="10.5" text-anchor="middle">${esc(t.l)}</text>` : ''}`).join('');

  const cx = 160, cy = 115, R = 82, dn = OVERALL_DIMS.length;
  const ang = i => (-90 + i * (360 / dn)) * Math.PI / 180;
  const poly = OVERALL_DIMS.map((d, i) => { const r = R * d.score / 100; return `${(cx + r * Math.cos(ang(i))).toFixed(1)},${(cy + r * Math.sin(ang(i))).toFixed(1)}`; }).join(' ');
  const rings = [0.34, 0.67, 1].map(f => `<polygon points="${OVERALL_DIMS.map((d, i) => `${(cx + R * f * Math.cos(ang(i))).toFixed(1)},${(cy + R * f * Math.sin(ang(i))).toFixed(1)}`).join(' ')}" fill="none" stroke="#E2E8EA"/>`).join('');
  const axes = OVERALL_DIMS.map((d, i) => {
    const lx = cx + (R + 20) * Math.cos(ang(i)), ly = cy + (R + 20) * Math.sin(ang(i));
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(ang(i))).toFixed(1)}" y2="${(cy + R * Math.sin(ang(i))).toFixed(1)}" stroke="#E2E8EA"/>
      <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" fill="#56646D" font-size="11" text-anchor="${lx < cx - 4 ? 'end' : lx > cx + 4 ? 'start' : 'middle'}">${esc(d.cn)}</text>`;
  }).join('');

  const distList = SCENARIOS.map(s => ({ cn: s.cn, n: mine.filter(r => r.sc === s.id).length, col: s.c2 || '#2D6CC0' })).filter(d => d.n);
  const distMax = Math.max(1, ...distList.map(d => d.n));
  const dist = distList.map(d => `<div class="bar-row"><div class="lb"><span>${esc(d.cn)}</span><span>${d.n} 次</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${(d.n / distMax * 100).toFixed(0)}%;background:linear-gradient(90deg,${d.col}99,${d.col})"></div></div></div>`).join('') || '<div class="empty">此區間沒有對練</div>';

  const recent = mine.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6).map(r => {
    const sc = scenarioById(r.sc) || {};
    return `<tr class="clickable" data-act="goto" data-arg="#/s/${r.sc}/report/${r.id}">
      <td><b>${esc(sc.cn || r.sc)}</b></td><td>${esc(r.pe)}</td><td class="mono">${esc(String(r.date).slice(0, 10))}</td>
      <td class="num">${r.status === 'done' ? `<b class="mono" style="color:${scoreCol(r.score)}">${r.score}</b>` : '—'}</td></tr>`;
  }).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>我的數據</h1><p>${esc(S.user.name)}　·　${esc(UNITS[S.user.unit])}　·　只顯示你自己的對練成績。</p></div>
    ${viewRangeBar(`累計 ${allMine.length} 場`)}
    <div class="kpis">
      ${kpi('練', '對練場次', mine.length, rb.text, '#D81E26')}
      ${kpi('分', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 場已評分`, '#E0882E')}
      ${kpi('時', '練習時長', minutes ? minutesText(minutes) : '—', mine.length ? `平均每場 ${minutesText(minutes / mine.length)}` : '此區間沒有對練', '#009E96')}
      ${kpi('過', '通過率', passRateText(prMine), passRateSub(prMine, TARGETS.passRate), prCol(prMine, TARGETS.passRate))}
    </div>
    <div class="card" style="margin-bottom:18px"><div class="card-h"><h2>各場景通過率</h2><div class="sub">${esc(rb.text)}・通過次數 ÷ 全部對練次數・目標依場景設定</div></div>
      <table class="tbl" style="margin-top:12px"><thead><tr><th>場景</th><th>單場通關判定</th><th class="num">對練次數</th><th class="num">通過</th><th class="num">通過率</th><th class="num">目標</th><th>狀態</th></tr></thead><tbody>${scPassRows || '<tr><td colspan="7" class="empty">尚無對練記錄</td></tr>'}</tbody></table></div>
    <div class="grid-me dash-row">
      <div class="card"><div class="card-h"><h2>得分趨勢</h2><div class="sub">${esc(rb.text)}・${n > 1 ? '各期平均分' : '單場分數'}</div></div>
        <div class="chart-body">${n ? '' : '<div class="empty">此區間沒有已評分的對練</div>'}<svg class="chart trend" viewBox="0 0 ${W} ${H}" style="${n ? '' : 'display:none'}">
          <defs><linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D81E26" stop-opacity=".22"/><stop offset="100%" stop-color="#D81E26" stop-opacity="0"/></linearGradient></defs>
          ${grid}
          <path d="${area}" fill="url(#tf)"/>
          <polyline points="${line}" fill="none" stroke="#D81E26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
        </svg></div></div>
      <div class="card"><div class="card-h"><h2>能力雷達</h2><div class="sub">COMPETENCY RADAR</div></div>
        <div class="chart-body"><svg class="chart radar" viewBox="0 0 320 250">
          ${rings}${axes}<polygon points="${poly}" fill="rgba(0,158,150,.2)" stroke="#009E96" stroke-width="2"/>
        </svg></div></div>
    </div>
    <div class="grid-me dash-row">
      <div class="card"><div class="card-h"><h2>我的最近對練</h2><div class="sub">${esc(rb.text)}</div></div>
        ${mine.length ? `<table class="tbl" style="margin-top:12px"><thead><tr><th>場景</th><th>客戶畫像</th><th>日期</th><th class="num">得分</th></tr></thead><tbody>${recent}</tbody></table>`
                      : `<div class="empty">${allMine.length ? '此區間沒有對練記錄，試試切換區間。' : '你還沒有對練記錄。'}</div>`}</div>
      <div class="card"><div class="card-h"><h2>場景練習分布</h2><div class="sub">${esc(rb.text)}</div></div><div class="card-b">${dist}</div></div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 洞察分析（主管模組） */
function viewInsights() {
  const rows = visibleSessions().filter(inRange);
  const done = rows.filter(r => r.status === 'done');
  const avg = done.length ? done.reduce((a, b) => a + b.score, 0) / done.length : 0;
  const rb = rangeBounds();
  const ids = visibleMemberIds(S.user);
  const people = MEMBERS.filter(m => ids.includes(m.id));

  const unitAgg = {};
  rows.forEach(r => {
    const m = memberById(r.member); if (!m) return;
    const u = unitAgg[m.unit] || (unitAgg[m.unit] = { n: 0, sum: 0, scored: 0, rows: [] });
    u.n++; u.rows.push(r); if (r.status === 'done') { u.sum += r.score; u.scored++; }
  });
  const unitRows = Object.entries(unitAgg).sort((a, b) => (b[1].scored ? b[1].sum / b[1].scored : 0) - (a[1].scored ? a[1].sum / a[1].scored : 0))
    .map(([u, v], i) => {
      const s = v.scored ? v.sum / v.scored : 0;
      return `<div class="bar-row"><div class="lb">
        <span><b style="color:var(--ink)">${i + 1}. ${esc(UNITS[u] || u)}</b>　<span style="color:var(--muted)">${v.n} 場・通過 <b style="color:${prCol(passRate(v.rows), TARGETS.passRate)}">${passRateText(passRate(v.rows))}</b></span></span>
        <span style="color:${scoreCol(s)};font-weight:700">${s ? s.toFixed(1) : '—'}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${s ? s : 0}%;background:linear-gradient(90deg,${scoreCol(s)}99,${scoreCol(s)})"></div></div></div>`;
    }).join('');

  const G = TARGETS.grades;
  const buckets = [[`優秀（${G.excellent} 分以上）`, '#1E9E63', r => r.score >= G.excellent], [`良好（${G.good}–${G.excellent - 1} 分）`, '#2D6CC0', r => r.score >= G.good && r.score < G.excellent],
                   [`合格（${G.pass}–${G.good - 1} 分）`, '#E0882E', r => r.score >= G.pass && r.score < G.good], [`待提升（${G.pass} 分以下）`, '#D81E26', r => r.score < G.pass]];
  const total = done.length || 1;
  const distRows = buckets.map(([l, c, f]) => {
    const n = done.filter(f).length;
    return `<div class="bar-row"><div class="lb"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:7px"></i>${esc(l)}</span>
      <span>${Math.round(n / total * 100)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${n / total * 100}%;background:${c}"></div></div></div>`;
  }).join('');

  const board = people.map(m => {
    const mine = rows.filter(r => r.member === m.id && r.status === 'done');
    const s = mine.length ? mine.reduce((a, b) => a + b.score, 0) / mine.length : 0;
    return { m, n: rows.filter(r => r.member === m.id).length, s, pr: passRate(rows.filter(r => r.member === m.id)) };
  }).sort((a, b) => b.s - a.s).map((x, i) => `<tr>
      <td class="mono" style="color:var(--muted)">${i + 1}</td>
      <td><b>${esc(x.m.name)}</b>${x.m.id === S.user.id ? ' <span class="pill" style="color:var(--red);background:var(--red-soft)">我</span>' : ''}</td>
      <td>${esc(UNITS[x.m.unit])}</td><td>${esc(ROLES[x.m.role].cn)}</td>
      <td class="mono">${x.n}</td>
      <td class="num"><b class="mono" style="color:${prCol(x.pr, TARGETS.passRate)}">${passRateText(x.pr)}</b></td>
      <td class="num"><b class="mono" style="color:${scoreCol(x.s)}">${x.s ? x.s.toFixed(1) : '—'}</b></td></tr>`).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>洞察分析 <span class="tag-mgr">主管模組</span></h1><p>跨場景的團隊表現：依組織層級彙總。</p></div>
    <div class="scope-note">${esc(scopeLabel(S.user))}</div>
    ${viewRangeBar()}
    <div class="kpis" style="grid-template-columns:repeat(5,1fr)">
      ${kpi('均', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 場已評分`, '#D81E26')}
      ${(() => { const pr = passRate(rows); return kpi('過', '通過率', passRateText(pr), passRateSub(pr, TARGETS.passRate), prCol(pr, TARGETS.passRate)); })()}
      ${kpi('場', '對練場次', rows.length, `${esc(rb.text)}・${rows.length - done.length} 場待評`, '#2D6CC0')}
      ${kpi('人', '覆蓋人數', new Set(rows.map(r => r.member)).size, `可視成員 ${people.length} 人`, '#009E96')}
      ${kpi('景', '涵蓋場景', new Set(rows.map(r => r.sc)).size, `共 ${SCENARIOS.length} 個場景`, '#6A5BC4')}
    </div>
    <div class="grid2 dash-row" style="margin-bottom:18px">
      <div class="card"><div class="card-h"><h2>單位對比</h2><div class="sub">依平均得分排序</div></div><div class="card-b">${unitRows || '<div class="empty">尚無資料</div>'}</div></div>
      <div class="card"><div class="card-h"><h2>得分分級分布</h2><div class="sub">共 ${done.length} 場已評分</div></div><div class="card-b">${distRows}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>人員排行</h2><div class="sub">可視範圍內的成員</div></div>
      <table class="tbl" style="margin-top:12px"><thead><tr><th>#</th><th>姓名</th><th>所屬單位</th><th>角色</th><th>對練</th><th class="num">通過率</th><th class="num">平均分</th></tr></thead>
      <tbody>${board}</tbody></table>
      <div class="tbl-foot">${esc(scopeLabel(S.user))}</div></div>
  </div>`;
}

/* ------------------------------------------------------------------ 系統設定 */
function viewSysScenarios() {
  const tabs = [['list', '場景清單'], ['agent', 'Agent 配置']].map(([k, l]) =>
    `<button class="${S.settingsTab === k ? 'on' : ''}" data-act="settab" data-arg="${k}">${l}</button>`).join('');

  const toolbar = S.settingsTab === 'list'
    ? `<div class="filters" style="margin-bottom:14px"><div style="margin-left:auto"><button class="btn-primary" data-act="scnnew">＋ 新增場景</button></div></div>`
    : (() => { const cur = S.agentScn && scenarioById(S.agentScn) ? S.agentScn : ''; const curSc = cur ? scenarioById(cur) : null; const blocked = !curSc || !curSc.personas.length;
        const opts = ['<option value="">選擇場景…</option>'].concat(Object.keys(CATS).map(k => { const list = SCENARIOS.filter(s => s.cat === k); return list.length ? `<optgroup label="${esc(CATS[k].short)}">${list.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''} ${!s.personas.length ? 'disabled' : ''}>${esc(s.cn)}${SCENARIO_META[s.id].status !== 'on' ? '（未啟用）' : ''}${!s.personas.length ? '（尚無客戶畫像）' : ''}</option>`).join('')}</optgroup>` : ''; })).join('');
        const hint = !cur ? '先選擇要配置的場景' : !curSc.personas.length ? '此場景尚無客戶畫像，請先到場景清單編輯' : `${curSc.personas.length} 個客戶畫像 × ${(curSc.diffs || []).length} 個難度，已配置 ${ensureAgents(cur).length} 組`;
        return `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">Agent 由「AltaBots 對應清單」下拉帶入（成員權限 › Agent 對應），每組對應一個客戶畫像 × 難度。</div><div style="margin-left:auto;display:flex;gap:8px;align-items:center"><small style="color:${blocked && cur ? 'var(--red)' : 'var(--muted)'}">${esc(hint)}</small><select id="agent-scn" class="sel-sm" data-act="agentscn">${opts}</select><button class="btn-primary" data-act="agentnew" ${blocked ? 'disabled' : ''}>＋ 新增 Agent</button></div></div>`; })();
  const body = S.settingsTab === 'list'
    ? SCENARIOS.map(s => {
        const meta = SCENARIO_META[s.id];
        return `<div class="card" style="padding:18px;margin-bottom:12px;display:flex;align-items:center;gap:16px">
          <div class="ic" style="width:42px;height:42px;border-radius:11px;background:${s.tint};display:flex;align-items:center;justify-content:center;flex-shrink:0">${iconFor(s)}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px">
              <b style="font-size:15px">${esc(s.cn)}</b>
              <span class="pill" style="color:${meta.status === 'on' ? '#1E9E63' : '#7C8992'};background:${meta.status === 'on' ? '#EAF8F2' : '#F4F7F8'}">${meta.status === 'on' ? '已啟用' : '未啟用'}</span>
            </div>
            <div style="font-size:12.5px;color:var(--body);margin-bottom:6px">${esc(s.desc)}</div>
            <div style="font-size:11.5px;color:var(--muted)">可用畫面：對練記錄・對練・統計　｜　版本 ${esc(meta.ver)}　｜　維護人 ${esc(meta.owner)}　｜　客戶畫像 ${s.personas.length} 個　｜　Agent ${ensureAgents(s.id).length} 組（${ensureAgents(s.id).filter(g => g.status === 'on').length} 組啟用）　｜　評估：${esc(ensureEval(s.id).name)}（${esc((SCHEMAS[ensureEval(s.id).schema] || {}).name || ensureEval(s.id).schema)}）</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0"><button class="btn-ghost" data-act="editscn" data-arg="${s.id}">編輯</button><button class="btn-ghost danger" data-act="scndel" data-arg="${s.id}" title="${meta.status === 'on' ? '請先停用再刪除' : (sessionsAll(s.id) ? '已有對練記錄，不可刪除' : '刪除場景')}">刪除</button></div>
        </div>`;
      }).join('')
    : `<div class="card"><table class="tbl">
        <thead><tr><th>場景</th><th>客戶畫像</th><th>難度</th><th>對練 Agent</th><th>iframe</th><th>AltaBots 對應・可用角色</th><th class="num">狀態</th><th></th></tr></thead>
        <tbody>${SCENARIOS.filter(s => !S.agentScn || s.id === S.agentScn).flatMap(s => ensureAgents(s.id).map(g => {
          const p = s.personas.find(x => x.id === g.personaId); const df = DIFF[g.diff]; const ls = agentLinkState(g);
          return `<tr><td><b>${esc(s.cn)}</b></td>
            <td>${p ? `<span class="pill" style="color:${p.col};background:${p.col}1f">${esc(p.name)}</span>` : '—'}</td>
            <td>${df ? `<span class="pill" style="color:${df.col};background:${df.col}1f">${df.cn}</span>` : '—'}</td>
            <td class="mono" style="font-size:12px;color:var(--muted)">${esc(g.name || '—')}</td>
            <td class="mono" style="font-size:11.5px;color:${g.embed ? 'var(--ink)' : 'var(--faint)'}">${g.embed ? esc(embedSrc(g.embed) || '已設定') : '未設定'}</td>
            <td style="font-size:11.5px">${ls.a ? `<span class="pill ${ls.level === 'ok' ? 'good' : 'bad'}">${ls.level === 'ok' ? '已對應' : esc(ls.text)}</span>${ls.level === 'ok' ? `<div style="color:var(--muted);margin-top:3px">${esc(ls.a.roles.map(r => ROLES[r] ? ROLES[r].cn : r).join('、'))}</div>` : ''}` : (g.embed ? '<span class="pill" style="color:#E0882E;background:#FDF3E7">未在對應清單</span>' : '—')}</td>
            <td class="num"><span class="pill" style="color:${g.status === 'on' ? '#1E9E63' : '#7C8992'};background:${g.status === 'on' ? '#EAF8F2' : '#F4F7F8'}">${g.status === 'on' ? '已啟用' : '未啟用'}</span></td>
            <td class="num"><button class="btn-ghost sm" data-act="editscn" data-arg="${s.id}">編輯</button></td></tr>`;
        })).join('')}</tbody></table>
        <div class="tbl-foot">Agent 依「場景 → 客戶畫像 × 難度」配置；在場景的編輯對話框從 AltaBots 對應清單下拉選擇或調整。${S.agentScn ? '目前只顯示所選場景。' : ''}</div></div>`;

  return `<div class="wrap">
    <div class="page-h"><h1>場景設定</h1><p>維護工作場景與對練 Agent；啟用後會出現在左側「工作場景」與場景中心。</p></div>
    <div class="tabs">${tabs}</div>${toolbar}${body}</div>${viewEditScenarioModal()}${viewDlg()}`;
}

function viewSysMembers() {
  const tabs = [['members', '成員管理'], ['roles', '角色管理'], ['org', '組織管理'], ['agents', 'Agent 對應']].map(([k, l]) =>
    `<button class="${S.memberTab === k ? 'on' : ''}" data-act="memtab" data-arg="${k}">${l}</button>`).join('');

  let body = '';
  if (S.memberTab === 'agents') {
    const kindCn = { drill: '對練', eval: '評估' };
    const rows = AGENTS.slice().sort((a, b) => (a.kind > b.kind ? 1 : a.kind < b.kind ? -1 : 0) || String(a.cat).localeCompare(String(b.cat)) || a.name.localeCompare(b.name, 'zh-Hant')).map(a => {
      const use = agentUsage(a); const scs = [...new Set(use.map(u => u.sc.cn))];
      const st = a.missing ? '<span class="pill bad">工作空間已移除</span>' : a.status === 'on' ? '<span class="pill good">啟用</span>' : '<span class="pill" style="color:#7C8992;background:#F4F7F8">停用</span>';
      return `<tr>
        <td><b>${esc(a.name)}</b><div class="mono" style="font-size:10.5px;color:var(--faint)">${esc(a.id)}</div></td>
        <td><span class="pill" style="color:${a.kind === 'drill' ? 'var(--blue)' : '#6A5BC4'};background:${a.kind === 'drill' ? '#EDF3FB' : '#EFEDF8'}">${kindCn[a.kind] || a.kind} Agent</span></td>
        <td style="font-size:12px">${CATS[a.cat] ? esc(CATS[a.cat].short) : '—'}</td>
        <td class="mono" style="font-size:11.5px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(a.kind === 'drill' ? a.src : a.workflow)}">${esc(a.kind === 'drill' ? a.src : a.workflow)}</td>
        <td>${(a.roles || []).length ? a.roles.map(r => ROLES[r] ? `<span class="pill" style="color:var(--blue);background:#EDF3FB;margin:1px 3px 1px 0">${esc(ROLES[r].cn)}</span>` : '').join('') : '<span class="pill bad">無</span>'}</td>
        <td style="font-size:12px">${scs.length ? scs.map(x => esc(x)).join('、') : '<span style="color:var(--faint)">未使用</span>'}</td>
        <td>${st}</td>
        <td style="font-size:11px;color:var(--muted)">${a.source === 'altabots' ? `AltaBots<br>${esc(a.synced || '')}${a.edited ? '<br><span style="color:var(--red)">本地已修改</span>' : ''}` : '本地'}</td>
        <td class="num" style="white-space:nowrap"><button class="btn-ghost sm" data-act="agentopen" data-arg="${a.id}">編輯</button> <button class="btn-ghost sm danger" data-act="agentremove" data-arg="${a.id}" ${use.length ? 'disabled title="仍有場景使用"' : ''}>移除</button></td></tr>`;
    }).join('');
    const byRole = Object.keys(ROLES).map(k => { const list = ROLE_BYPASS.includes(k) ? AGENTS.filter(a => a.status === 'on') : AGENTS.filter(a => a.status === 'on' && (a.roles || []).includes(k)); return `<div class="bar-row"><div class="lb"><span><b style="color:var(--ink)">${esc(ROLES[k].cn)}</b>${ROLE_BYPASS.includes(k) ? ' <small style="color:var(--muted)">不受限</small>' : ''}</span><span>${list.filter(a => a.kind === 'drill').length} 個對練・${list.filter(a => a.kind === 'eval').length} 個評估</span></div><div style="font-size:12px;color:var(--body);margin-top:4px">${list.length ? list.map(a => esc(a.name)).join('、') : '<span style="color:var(--faint)">無可用 Agent</span>'}</div></div>`; }).join('');
    body = `<div class="filters" style="margin-bottom:14px">
        <div style="font-size:12.5px;color:var(--muted)">角色 × Agent 的對應以 AltaBots.ai 工作空間為主資料來源${S.agentsSyncedAt ? `，上次同步 ${esc(S.agentsSyncedAt)}` : ''}；場景設定的 Agent 配置從這裡的清單下拉選擇，發起對練時依學員角色檢核。</div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn-ghost" data-act="agentapiopen">${svg(I.globe, 15)}同步 AltaBots</button>
          <button class="btn-primary" data-act="agentopen" data-arg="">新增對應</button>
        </div></div>
      <div class="card" style="margin-bottom:14px"><table class="tbl">
        <thead><tr><th>Agent</th><th>類型</th><th>場景類型</th><th>嵌入網址／端點</th><th>可用角色</th><th>使用場景</th><th>狀態</th><th>來源</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="empty">尚無對應資料，請先同步 AltaBots 工作空間</td></tr>'}</tbody></table>
        <div class="tbl-foot">仍被場景使用的對應項不可移除；覆蓋同步時工作空間已不存在的 Agent 標記為停用。</div></div>
      <div class="card"><div class="card-h"><h2>依角色檢視</h2><div class="sub">各角色可使用的 Agent</div></div><div class="card-b">${byRole}</div></div>`;
  } else if (S.memberTab === 'members') {
    const q = S.memberSearch.trim().toLowerCase();
    const rows = MEMBERS.filter(m => !q || (m.name + m.email + ROLES[m.role].cn + (UNITS[m.unit] || '')).toLowerCase().includes(q));
    body = `<div class="filters" style="margin-bottom:14px">
        <div class="inp">${svg(I.search, 15)}<input placeholder="搜尋姓名、郵箱、角色或單位…" data-act="memsearch" data-keep-focus="memsearch" value="${esc(S.memberSearch)}"></div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn-ghost" data-act="apiopen">${svg(I.globe, 15)}API 同步</button>
          <button class="btn-ghost" data-act="csvopen">${svg(I.doc, 15)}CSV 匯入</button>
          <button class="btn-primary" data-act="memberopen" data-arg="">新增成員</button>
        </div></div>
      <div class="card"><table class="tbl">
      <thead><tr><th>名稱</th><th>電子郵箱</th><th>角色</th><th>所屬單位</th><th>加入時間</th><th class="num">狀態</th><th class="num">操作</th></tr></thead>
      <tbody>${rows.map(m => `<tr>
        <td><span style="display:inline-flex;align-items:center;gap:9px">
          <span style="width:28px;height:28px;border-radius:50%;background:${m.col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${esc(m.name[0])}</span>
          <b>${esc(m.name)}</b>${m.id === S.user.id ? ' <span class="pill" style="color:var(--red);background:var(--red-soft)">我</span>' : ''}</span></td>
        <td style="color:var(--muted);font-size:12.5px">${esc(m.email)}${m.synced ? `<div class="mono" style="font-size:10.5px;color:var(--faint)">altabots 同步 ${esc(m.synced)}</div>` : ''}</td>
        <td><span class="pill" style="color:var(--blue);background:#EDF3FB">${esc(ROLES[m.role].cn)}</span></td>
        <td>${esc(UNITS[m.unit] || '—')}</td><td class="mono">${esc(m.joined)}</td>
        <td class="num"><span class="pill" style="color:${m.active ? '#1E9E63' : '#7C8992'};background:${m.active ? '#EAF8F2' : '#F4F7F8'}">${m.active ? '啟用' : '停用'}</span></td>
        <td class="num" style="white-space:nowrap"><button class="btn-ghost sm" data-act="memberopen" data-arg="${m.id}">編輯</button> <button class="btn-ghost sm" data-act="membertoggle" data-arg="${m.id}">${m.active ? '停用' : '啟用'}</button></td>
      </tr>`).join('')}</tbody></table>
      <div class="tbl-foot">共 ${MEMBERS.length} 位成員${q ? `，符合搜尋 ${rows.length} 位` : ''}　·　正式版成員與角色繼承自 altabots 工作空間，此頁的新增與匯入作為補登與批次校正。</div></div>`;
  } else if (S.memberTab === 'roles') {
    const chk = (k, key) => `<label class="chk"><input type="checkbox" data-roleperm="${k}:${key}" ${ROLE_PERMS[k][key] ? 'checked' : ''}></label>`;
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">角色類型即成員表單與 CSV 匯入的「角色」下拉選單來源。</div><div style="margin-left:auto"><button class="btn-primary" data-act="roleopen" data-arg="">＋ 新增角色</button></div></div>
      <div class="card"><table class="tbl roles">
      <thead><tr><th>角色</th><th>資料範圍</th><th>我的數據</th><th>洞察分析</th><th>對練統計</th><th>場景設定</th><th>系統設定（全部）</th><th class="num">成員數</th><th class="num">操作</th></tr></thead>
      <tbody>${Object.keys(ROLES).map(k => {
        const r = ROLES[k]; const locked = k === 'OWNER';
        return `<tr><td><b>${esc(r.cn)}</b> <span class="mono" style="color:var(--faint);font-size:11px">${k}</span>${r.custom ? ' <span class="pill info">自訂</span>' : ''}</td>
          <td><select class="sel-sm" data-roleperm="${k}:scope" ${locked ? 'disabled' : ''}>${['all', 'team', 'self'].map(v => `<option value="${v}" ${r.scope === v ? 'selected' : ''}>${{ all: '全行', team: '本人與下屬', self: '僅本人' }[v]}</option>`).join('')}</select></td>
          <td><span class="pill" style="color:#1E9E63;background:#EAF8F2">永遠可見（依資料範圍）</span></td>
          <td>${locked ? '<span class="pill good">是</span>' : chk(k, 'insights')}</td>
          <td>${locked ? '<span class="pill good">是</span>' : chk(k, 'stats')}</td>
          <td>${locked ? '<span class="pill good">是</span>' : chk(k, 'scenarioSettings')}</td>
          <td>${locked ? '<span class="pill good">是</span>' : chk(k, 'settings')}</td>
          <td class="num mono">${MEMBERS.filter(m => m.role === k).length}</td>
          <td class="num" style="white-space:nowrap">${locked ? '<span class="pill" style="color:var(--faint);background:var(--soft)">固定</span>' : `<button class="btn-ghost sm" data-act="roleopen" data-arg="${k}">編輯</button>${r.custom ? ` <button class="btn-ghost sm danger" data-act="roledel" data-arg="${k}">刪除</button>` : ''}`}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="tbl-foot">勾選即生效並保存。數據報表（我的數據、洞察分析、對練統計）與複盤報告的可見範圍都跟著此處的角色設定：資料範圍決定看得到誰的場次，洞察分析與對練統計決定能否進入主管模組。</div></div>`;
  } else {
    const node = (n, depth) => {
      const count = MEMBERS.filter(m => m.unit === n.id).length;
      const canAddChild = depth < 2; const canDel = depth > 0;
      return `<div class="org-row" style="padding-left:${14 + depth * 26}px">
        <span style="font-size:13.5px;font-weight:${depth === 0 ? 700 : 600}">${esc(n.name)}</span>
        <span class="mono" style="font-size:11px;color:var(--faint)">${esc(n.code)}</span>
        ${count ? `<span class="pill" style="color:var(--blue);background:#EDF3FB">${count} 位成員</span>` : ''}
        <span class="org-acts">
          ${canAddChild ? `<button class="btn-ghost sm" data-act="orgadd" data-arg="${n.id}">新增${depth === 0 ? '處' : '單位'}</button>` : ''}
          ${depth > 0 ? `<button class="btn-ghost sm" data-act="orgedit" data-arg="${n.id}">${depth === 2 ? '編輯／移動' : '編輯'}</button>` : ''}
          ${canDel ? `<button class="btn-ghost sm danger" data-act="orgdel" data-arg="${n.id}">刪除</button>` : ''}
        </span>
      </div>` + (n.children || []).map(c => node(c, depth + 1)).join('');
    };
    body = `<div class="filters" style="margin-bottom:14px"><div style="font-size:12.5px;color:var(--muted)">四層組織：事業群 → 處 → 單位 → 理專。每列右側可新增下層、編輯／移動、刪除。</div>
        <div style="margin-left:auto;display:flex;gap:8px"><button class="btn-ghost" data-act="orgcsvopen">${svg(I.doc, 15)}CSV 匯入組織</button><button class="btn-primary" data-act="orgadd" data-arg="${ORG.id}">＋ 新增處</button></div></div>
      <div class="card">${node(ORG, 0)}<div class="tbl-foot">主管的可視範圍為所屬「處」底下所有單位；單位可移動至其他處，有成員或子節點時不可刪除。正式版組織以 altabots 為主，此處匯入作為補登與批次校正。</div></div>`;
  }

  return `<div class="wrap">
    <div class="page-h"><h1>成員權限</h1><p>管理系統成員、角色權限與組織配置。角色直接決定導覽與資料範圍。</p></div>
    <div class="tabs">${tabs}</div>${body}</div>${viewDlg()}`;
}

function auditRows() {
  const f = S.auditFilter; const q = f.q.trim().toLowerCase();
  const from = f.from ? f.from.replace(/-/g, '/') : ''; const to = f.to ? f.to.replace(/-/g, '/') + ' 23:59' : '';
  let rows = AUDIT.filter(a => (!from || a.at >= from) && (!to || a.at <= to) && (f.who === '全部' || a.who === f.who) && (f.mod === '全部' || a.mod === f.mod)
    && (!q || (a.at + a.mod + a.act + a.who + a.detail).toLowerCase().includes(q)));
  const { key, dir } = S.auditSort; const sgn = dir === 'asc' ? 1 : -1;
  rows = rows.slice().sort((x, y) => { const vx = String(x[key] || ''), vy = String(y[key] || ''); return vx === vy ? 0 : (vx > vy ? sgn : -sgn); });
  return rows;
}
function viewSysAudit() {
  const rows = auditRows(); const f = S.auditFilter;
  const mods = {}; rows.forEach(a => { mods[a.mod] = (mods[a.mod] || 0) + 1; });
  const maxMod = Math.max(1, ...Object.values(mods));
  const bars = Object.entries(mods).sort((x, y) => y[1] - x[1]).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v}</span></div>
     <div class="bar-track"><div class="bar-fill" style="width:${v / maxMod * 100}%;background:linear-gradient(90deg,#9485D2,#6A5BC4)"></div></div></div>`).join('') || '<div class="empty" style="padding:14px">沒有符合條件的記錄</div>';
  const whoOpts = ['全部', ...new Set(AUDIT.map(a => a.who))]; const modOpts = ['全部', ...new Set(AUDIT.map(a => a.mod))];
  const today = todayStr().replace(/-/g, '/'); const todayCount = AUDIT.filter(a => a.at.startsWith(today)).length;
  const th = (key, label, cls = '') => { const on = S.auditSort.key === key; return `<th class="sortable ${cls} ${on ? 'on' : ''}" data-act="auditsort" data-arg="${key}">${label}<span class="sort-ic">${on ? (S.auditSort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span></th>`; };
  const active = f.from || f.to || f.who !== '全部' || f.mod !== '全部' || f.q.trim();
  return `<div class="wrap">
    <div class="page-h"><h1>操作記錄</h1><p>系統與成員的操作軌跡；可依時間、人員、功能模組查詢，點欄位標題排序。</p></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      ${kpi('總', active ? '符合筆數' : '總操作數', rows.length, active ? `全部 ${AUDIT.length} 筆` : '全部記錄', '#6A5BC4')}
      ${kpi('日', '今日操作', todayCount, today, '#2D6CC0')}
      ${kpi('人', '操作人數', new Set(rows.map(a => a.who)).size, '不重複', '#009E96')}
    </div>
    <div class="card audit-filter">
      <label><span>起始日</span><input type="date" data-audit="from" value="${esc(f.from)}"></label>
      <label><span>結束日</span><input type="date" data-audit="to" value="${esc(f.to)}"></label>
      <label><span>人員</span><select data-audit="who">${whoOpts.map(w => `<option ${w === f.who ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></label>
      <label><span>功能模組</span><select data-audit="mod">${modOpts.map(m => `<option ${m === f.mod ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      <label style="flex:1;min-width:200px"><span>關鍵字</span><input placeholder="搜尋操作、對象或內容…" data-act="auditsearch" data-keep-focus="auditsearch" value="${esc(f.q)}"></label>
      <button class="btn-ghost sm" data-act="auditclear" ${active ? '' : 'disabled'}>清除條件</button>
    </div>
    <div class="grid2" style="align-items:start;grid-template-columns:1fr 2fr">
      <div class="card"><div class="card-h"><h2>依模組統計</h2><div class="sub">符合條件 ${rows.length} 筆</div></div><div class="card-b">${bars}</div></div>
      <div class="card"><div class="card-h"><h2>操作軌跡</h2><div class="sub">${S.auditSort.key === 'at' ? (S.auditSort.dir === 'desc' ? '最新在前' : '最舊在前') : `依${{ mod: '模組', act: '操作', who: '人員', detail: '內容' }[S.auditSort.key]}排序`}</div></div>
        <table class="tbl audit" style="margin-top:12px"><thead><tr>${th('at', '時間')}${th('mod', '模組')}${th('act', '操作')}${th('who', '人員')}${th('detail', '內容')}</tr></thead>
        <tbody>${rows.length ? rows.map(a => `<tr>
          <td class="mono" style="width:132px;font-size:11.5px;color:var(--muted)">${esc(a.at)}</td>
          <td style="width:90px"><span class="pill" style="color:var(--purple);background:#F1EAFE">${esc(a.mod)}</span></td>
          <td style="width:96px"><span class="pill" style="color:var(--blue);background:#EDF3FB">${esc(a.act)}</span></td>
          <td style="width:70px"><b>${esc(a.who)}</b></td>
          <td style="font-size:12.5px;color:var(--body)">${esc(a.detail)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty" style="padding:22px;text-align:center">沒有符合條件的操作記錄</td></tr>'}</tbody></table>
        <div class="tbl-foot">共 ${rows.length} 筆</div></div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ render */
function render() {
  const root = document.getElementById('root');
  const focusId = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.keepFocus : null;
  const caret = focusId ? document.activeElement.selectionStart : null;

  if (!S.user) { root.innerHTML = viewGate(); return; }

  const r = S.route;

  if (r.name === 'scenario' && r.tab === 'call') {
    const sc = scenarioById(r.sc);
    root.innerHTML = viewCall(sc);
    const box = document.getElementById('call-lines');
    if (box) box.scrollTop = box.scrollHeight;
    return;
  }

  let crumb = '', content = '';
  if (r.name === 'hub') {
    crumb = viewCrumb([{ label: '場景中心' }]);
    content = viewHub();
  } else if (r.name === 'scenario') {
    const sc = scenarioById(r.sc);
    if (!sc) { go('#/hub'); return; }
    const tabName = { records: '對練記錄', new: '發起對練', stats: '對練統計', report: '複盤報告' }[r.tab] || '對練記錄';
    crumb = viewCrumb([{ label: '場景中心', hash: '#/hub' }, { label: sc.cn }],
      { perm: true, back: r.tab === 'records' ? '#/hub' : `#/s/${sc.id}/records` });
    content = r.tab === 'new' ? viewNew(sc)
      : r.tab === 'stats' ? (CAN.stats(S.user) ? viewScenarioStats(sc) : viewNoPerm())
      : r.tab === 'report' ? viewReport(sc, r.arg)
      : viewRecords(sc);
    void tabName;
  } else if (r.name === 'me') {
    crumb = viewCrumb([{ label: '場景中心', hash: '#/hub' }, { label: '我的數據' }], { back: '#/hub' });
    content = viewMe();
  } else if (r.name === 'insights') {
    crumb = viewCrumb([{ label: '場景中心', hash: '#/hub' }, { label: '洞察分析' }], { perm: true, back: '#/hub' });
    content = CAN.stats(S.user) ? viewInsights() : viewNoPerm();
  } else if (r.name === 'sys') {
    const label = { scenarios: '場景設定', params: '參數設定', members: '成員權限', audit: '操作記錄' }[r.tab] || '場景設定';
    crumb = viewCrumb([{ label: '場景中心', hash: '#/hub' }, { label }], { perm: true, back: '#/hub' });
    const allowed = (r.tab === 'scenarios' || r.tab === 'params') ? CAN.scenarioSettings(S.user) : CAN.settings(S.user);
    content = allowed
      ? (r.tab === 'members' ? viewSysMembers() : r.tab === 'audit' ? viewSysAudit() : r.tab === 'params' ? viewSysParams() : viewSysScenarios())
      : viewNoPerm();
  }

  const pcNote = r.name === 'sys' ? `<div class="pc-note">${svg(I.warn, 14)} 系統設定建議使用電腦版操作；手機上可瀏覽，表格可左右滑動。</div>` : '';
  root.innerHTML = `<div class="shell ${S.collapsed ? 'collapsed' : ''} ${S.navOpen ? 'nav-open' : ''}">
    ${viewSidebar()}<div class="nav-bg" data-act="navclose"></div>
    <div class="main">${viewTopbar()}${crumb}<div class="content">${pcNote}${content}</div></div>
  </div>`;

  if (focusId) {
    const el = root.querySelector(`[data-keep-focus="${focusId}"]`);
    if (el) { el.focus(); if (caret != null) try { el.setSelectionRange(caret, caret); } catch (e) {} }
  }
}

function viewNoPerm() {
  return `<div class="wrap"><div class="card empty">
    <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:8px">沒有這個頁面的權限</div>
    你目前的角色是「${esc(ROLES[S.user.role].cn)}」，看不到這個模組。</div></div>`;
}

/* ------------------------------------------------------------------ actions */
function startCall() {
  const sc = scenarioById(S.route.sc);
  const p = curPersona(sc);
  clearInterval(S.timer);
  S.reveal = 0; S.elapsed = 0; S.confirmEnd = false; S.callPhase = 'ready';
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  S.liveSession = {
    id: Date.now().toString(16).slice(-10) + Math.random().toString(16).slice(2, 8), sc: sc.id, pe: p.name,
    diff: S.difficulty, member: S.user.id, date: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    dur: '0′00″', durationSec: 0, score: null, status: 'live', live: true,
  };
  audit('發起對練', `${S.liveSession.id.slice(0, 8)} ${sc.cn}・${p.name}`, '對練場景');
  go(`#/s/${sc.id}/call`);
}
/* iframe 內按「開始語音通話」：外框開始計時；逐字稿由 Agent 端產生（原型每 3 秒推進一句，通話中不顯示），結束後回傳供複盤 */
function iframeCallStart() {
  if (S.callPhase === 'live') return;
  const sc = scenarioById(S.route.sc); if (!sc) return;
  const lines = transcriptFor(sc.id);
  S.callPhase = 'live'; S.reveal = Math.max(1, S.reveal); clearInterval(S.timer);
  let tick = 0;
  S.timer = setInterval(() => {
    tick++; S.elapsed++;
    if (tick % 3 === 0 && S.reveal < lines.length) S.reveal++;
    if (S.route.name === 'scenario' && S.route.tab === 'call') render();
    else clearInterval(S.timer);
  }, 1000);
  render();
}
/* iframe 內按「結束通話」：Agent 回傳 ended 事件，外框停止計時並詢問是否送出評分 */
function iframeCallEnd() {
  if (S.callPhase !== 'live') return;
  clearInterval(S.timer); S.callPhase = 'ended'; S.confirmEnd = true; render();
}

/* ---- 對練場次：結束 → 評分中 → 完成（模擬評估 Agent，約 4 秒回傳） ---- */
const SCORING_DELAY_MS = 4000;
function simulateScore(session) {
  // 以該場景的示範維度為基礎，依對話完成度與難度微調；同一場次重算結果相同
  const rc = reportFor(session.sc); const lines = transcriptFor(session.sc);
  const ev = ensureEval(session.sc); const schema = ev && SCHEMAS[ev.schema];
  const baseDims = schema && !(schema.dims.length === rc.dims.length && schema.dims.every((x, i) => x.cn === rc.dims[i].cn))
    ? schema.dims.map((x, i) => ({ cn: x.cn, en: x.en, score: 78 + ((i * 7) % 11), note: `依評分規則「${schema.name}」第 ${i + 1} 項` }))
    : rc.dims;
  const covered = Math.max(1, Math.min(lines.length, session.reveal || lines.length)) / lines.length;
  let seed = 0; for (const ch of session.id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  const jitter = (seed % 9) - 4;                                   // -4 … +4
  const diffAdj = { L1: 3, L2: 0, L3: -3, normal: 2, complaint: -2 }[session.diff] || 0;
  const dims = baseDims.map((d, i) => {
    const s = Math.round(d.score * (0.82 + 0.18 * covered) + jitter + diffAdj + ((seed >> i) % 3) - 1);
    return { cn: d.cn, en: d.en, score: Math.max(55, Math.min(98, s)), note: d.note };
  });
  const overall = Math.round(dims.reduce((x, d) => x + d.score, 0) / dims.length);
  const shown = lines.slice(0, session.reveal || lines.length);
  const compliance = shown.filter(l => l.flag === 'compliance').length;
  const words = shown.reduce((n, l) => n + l.t.replace(/\s/g, '').length, 0);
  return { overall, dims, compliance, words };
}
function finishScoring(id) {
  const s = SESSIONS.find(x => x.id === id); if (!s || s.status !== 'evaluating') return;
  // 模擬 workflow 未成功觸發：第一次嘗試且場次 id 符合條件時逾時，標記暫無評分，使用者可在對練記錄重新觸發
  let seed = 0; for (const ch of s.id) seed = (seed * 31 + ch.charCodeAt(0)) % 97;
  if (!s.attempts) s.attempts = 0; s.attempts++;
  if (s.attempts === 1 && seed % 4 === 0) {
    s.status = 'no_score'; s.failReason = `評估 Agent workflow（${ensureEval(s.sc).workflow || '未設定'}）未回應，已逾時`; persistSessions();
    audit('評分逾時', `${s.id.slice(0, 8)} ${s.pe}・${s.failReason}`, '對練場景'); delete S.scoringTimers[id];
    const r1 = S.route; if (r1.name === 'scenario' || r1.name === 'me' || r1.name === 'hub') render(); return;
  }
  const r = simulateScore(s);
  // 模擬評估 Agent 回傳的通關訊號與法遵檢核：成交訊號 ≈ 分數過門檻且非特定種子；法遵否決：合規提醒 ≥ 3 且特定種子
  const ev0 = ensureEval(s.sc); const signal = r.overall >= (ev0 ? ev0.passScore : 70) && seed % 5 !== 0; const vetoFail = r.compliance >= 3 && seed % 7 === 0;
  Object.assign(s, { status: 'done', score: r.overall, dims: r.dims, compliance: r.compliance, words: r.words, signal, vetoFail, scoredAt: Date.now() });
  persistSessions(); audit('完成對練', `${s.id.slice(0, 8)} ${scenarioById(s.sc) ? scenarioById(s.sc).cn : s.sc}・已評分（${s.score}）`, '對練場景');
  delete S.scoringTimers[id];
  const r0 = S.route; if (r0.name === 'scenario' && (r0.tab === 'records' || (r0.tab === 'report' && r0.arg === id))) render();
  else if (r0.name === 'me' || r0.name === 'hub') render();
}
function scheduleScoring(id) { clearTimeout(S.scoringTimers[id]); S.scoringTimers[id] = setTimeout(() => finishScoring(id), SCORING_DELAY_MS); }
function rescoreSession(id) {
  const s = SESSIONS.find(x => x.id === id); if (!s) return;
  s.status = 'evaluating'; s.score = null; s.failReason = null; persistSessions(); audit('重新觸發評分', `${s.id.slice(0, 8)} ${s.pe}・${ensureEval(s.sc).workflow || ''}`, '對練場景'); scheduleScoring(id); render();
}
const LS_SESSIONS = 'sinopac-coach.sessions';
function persistSessions() { lsSet(LS_SESSIONS, SESSIONS.filter(s => s.userMade)); }
function loadSessions() {
  const saved = lsGet(LS_SESSIONS); if (!Array.isArray(saved)) return;
  saved.forEach(s => { if (!SESSIONS.some(x => x.id === s.id)) SESSIONS.unshift(s); });
  // 關閉頁面時還在評分中的場次，載入後直接補完評分
  SESSIONS.filter(s => s.userMade && s.status === 'evaluating').forEach(s => scheduleScoring(s.id));
}

function endCall() {
  clearInterval(S.timer);
  const sc = scenarioById(S.route.sc);
  const live = S.liveSession;
  S.confirmEnd = false;
  if (!live) { go(`#/s/${sc.id}/records`); return; }
  const m = Math.floor(S.elapsed / 60), s = S.elapsed % 60; S.callPhase = 'ready';
  Object.assign(live, { dur: `${m}′${String(s).padStart(2, '0')}″`, durationSec: S.elapsed, reveal: Math.max(1, S.reveal), status: 'evaluating', live: false, userMade: true });
  if (!SESSIONS.some(x => x.id === live.id)) SESSIONS.unshift(live);
  persistSessions(); scheduleScoring(live.id);
  S.liveSession = null;
  go(`#/s/${sc.id}/report/${live.id}`);
}

/* ---- 語音回放（計時推進 + 瀏覽器語音朗讀） ---- */
function replayTotal(session, lines) { const shown = lines.slice(0, session.reveal || lines.length); const last = shown.length ? shown[shown.length - 1].at : 0; return Math.max(session.durationSec || 0, last + 24); }
function replayVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = window.speechSynthesis.getVoices(); return vs.find(v => /zh[-_]TW/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
}
function speakLine(line, session) {
  if (!S.replay.voice || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line.text); u.lang = 'zh-TW'; const v = replayVoice(); if (v) u.voice = v;
    u.rate = 1.05; u.pitch = line.who === 'cust' ? 1.15 : 0.9; window.speechSynthesis.speak(u);
  } catch (e) { /* 無語音引擎時忽略 */ }
}
function replayStop(keepTime) {
  clearInterval(S.replay.timer); S.replay.timer = null; S.replay.playing = false;
  if (!keepTime) { S.replay.time = 0; S.replay.lastIdx = -1; }
  if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
}
function replayFor(session) { if (S.replay.sessionId !== session.id) { replayStop(false); S.replay.sessionId = session.id; } return S.replay; }
function activeLineIdx(lines, t) { let idx = -1; lines.forEach((l, i) => { if (t >= l.at) idx = i; }); return idx; }
function replayTick(session, lines) {
  const rp = S.replay; const total = replayTotal(session, lines);
  rp.time = Math.min(total, rp.time + 0.25);
  const idx = activeLineIdx(lines, rp.time);
  if (idx !== rp.lastIdx) { rp.lastIdx = idx; if (idx >= 0) speakLine(lines[idx], session); }
  // 只更新畫面上會變的部分，避免整頁重繪
  const bar = document.getElementById('rp-fill'); if (bar) bar.style.width = (rp.time / total * 100).toFixed(1) + '%';
  const cur = document.getElementById('rp-cur'); if (cur) cur.textContent = fmt(Math.floor(rp.time));
  document.querySelectorAll('.replay-line').forEach((el, i) => el.classList.toggle('on', i === idx));
  const act = document.querySelector('.replay-line.on'); if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (rp.time >= total) { replayStop(true); render(); }
}
function replayToggle(session) {
  const rp = replayFor(session); const lines = replayLines(session.sc);
  if (rp.playing) { replayStop(true); render(); return; }
  if (rp.time >= replayTotal(session, lines)) { rp.time = 0; rp.lastIdx = -1; }
  rp.playing = true; rp.lastIdx = activeLineIdx(lines, rp.time) - 1;
  rp.timer = setInterval(() => replayTick(session, lines), 250); render();
}
function replaySeek(session, sec) {
  const rp = replayFor(session); const lines = replayLines(session.sc);
  rp.time = Math.max(0, Math.min(replayTotal(session, lines), sec)); rp.lastIdx = activeLineIdx(lines, rp.time) - 1;
  if (!rp.playing) { rp.lastIdx = activeLineIdx(lines, rp.time); if (rp.lastIdx >= 0) speakLine(lines[rp.lastIdx], session); }
  render();
}

function currentReportSession() { const r = S.route; if (r.name !== 'scenario' || r.tab !== 'report') return null; return SESSIONS.find(s => s.id === r.arg) || null; }

const ACTIONS = {
  login: id => { S.user = memberById(id); go('#/hub'); render(); },
  logout: () => { clearInterval(S.timer); S.user = null; render(); },
  goto: hash => go(hash),
  collapse: () => { S.collapsed = !S.collapsed; render(); },
  hubcat: c => { S.hubCat = c; render(); },
  pickpersona: id => { const sc = scenarioById(S.route.sc); S.personaId = id; const p = curPersona(sc); S.difficulty = p.diff; render(); },
  pickdiff: k => { S.difficulty = k; render(); },
  startcall: () => startCall(),
  navtoggle: () => { S.navOpen = !S.navOpen; render(); }, navclose: () => { S.navOpen = false; render(); },
  rangegran: g => { setRangeGran(g); render(); }, rangeprev: () => { rangeShift(-1); render(); }, rangenext: () => { rangeShift(1); render(); }, rangetoday: () => { S.range.anchor = dKey(new Date()); render(); },
  askend: () => { S.confirmEnd = true; render(); },
  iframecall: () => iframeCallStart(), iframehang: () => iframeCallEnd(),
  cancelend: () => { S.confirmEnd = false; render(); },
  doend: () => endCall(),
  settab: t => { S.settingsTab = t; render(); },
  memtab: t => { S.memberTab = t; render(); },
  agentapiopen: () => openAgentApi(), agentapisync: () => agentApiSync(),
  agentopen: id => openAgentDlg(id || null), agentsave: () => saveAgentDlg(), agentremove: id => deleteAgent(id),
  editscn: id => openEditScenario(id || null),
  cancelscn: () => { S.editScenario = null; render(); },
  savescn: () => saveEditScenario(),
  agentadd: () => agentAdd(),
  agentdel: i => agentDel(i),
  personaadd: () => personaAdd(),
  personadel: i => personaDel(i),
  scnnew: () => openEditScenario(null),
  agentnew: () => { const sc = S.agentScn && scenarioById(S.agentScn); if (!sc) { alert('請先在下拉選單選擇場景'); return; } if (!sc.personas.length) { alert(`「${sc.cn}」尚無客戶畫像，請先在場景清單編輯新增客戶畫像`); return; } openEditScenario(sc.id, true); },
  dlgcancel: () => closeDlg(),
  memberopen: id => openMember(id),
  membersave: () => saveMember(),
  membertoggle: id => toggleMember(id),
  csvopen: () => openCsv(),
  csvsample: () => { if (S.dlg) { S.dlg.draft.text = CSV_SAMPLE; S.dlg.draft.rows = null; render(); } },
  csvparse: () => csvParse(),
  csvimport: () => csvImport(),
  apiopen: () => openApi(),
  apisync: () => apiSync(),
  orgadd: id => openOrg('add', id),
  orgedit: id => openOrg('edit', id),
  orgdel: id => deleteOrg(id),
  orgsave: () => saveOrg(),
  orgcsvopen: () => openOrgCsv(),
  auditsort: key => { const s = S.auditSort; if (s.key === key) s.dir = s.dir === 'asc' ? 'desc' : 'asc'; else { s.key = key; s.dir = key === 'at' ? 'desc' : 'asc'; } render(); },
  auditclear: () => { S.auditFilter = { from: '', to: '', who: '全部', mod: '全部', q: '' }; render(); },
  orgcsvsample: () => { if (S.dlg) { S.dlg.draft.text = ORG_CSV_SAMPLE; S.dlg.draft.rows = null; render(); } },
  orgcsvparse: () => orgCsvParse(),
  orgcsvimport: () => orgCsvImport(),
  roleopen: code => openRole(code || null),
  paramtab: t => { S.paramTab = t; S.targetMsg = null; render(); },
  targetsave: () => saveTargets(),
  scndel: id => openDeleteScenario(id),
  scndelconfirm: () => confirmDeleteScenario(),
  paramopen: arg => { const [kind, code] = arg.split(':'); openParam(kind, code || null); },
  paramsave: () => saveParam(),
  paramdel: arg => { const [kind, code] = arg.split(':'); deleteParam(kind, code); },
  poptadd: g => personaOptAdd(g),
  poptdel: arg => personaOptDel(arg),
  rolesave: () => saveRole(),
  roledel: code => deleteRole(code),
  rescore: id => rescoreSession(id),
  replaytoggle: () => { const s = currentReportSession(); if (s) replayToggle(s); },
  replayseek: sec => { const s = currentReportSession(); if (s) replaySeek(s, Number(sec)); },
  replayvoice: () => { S.replay.voice = !S.replay.voice; if (!S.replay.voice && 'speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} } render(); },
  replaybar: () => {},
  noop: () => {},
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'hubsearch' || act === 'recsearch' || act === 'globalsearch' || act === 'memsearch' || act === 'auditsearch' || act === 'agentscn') return;
  if (act === 'replaybar') { const s = currentReportSession(); if (s) { const rect = el.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); replaySeek(s, ratio * replayTotal(s, replayLines(s.sc))); } e.preventDefault(); return; }
  if (act === 'noop') return;   // 對話框容器：只用來擋住背景的關閉，不可攔截勾選框等原生行為
  const fn = ACTIONS[act];
  if (fn) { e.preventDefault(); fn(el.dataset.arg); }
});

document.addEventListener('input', e => {
  const f = e.target.closest('[data-field]');
  if (f && S.dlg) {
    const d = S.dlg.draft;
    if (f.dataset.field === 'diffs') { d.diffs = [...document.querySelectorAll('.modal [data-field="diffs"]')].filter(b => b.checked).map(b => b.value).join(','); return; }
    if (f.dataset.field === 'roles') { d.roles = [...document.querySelectorAll('.modal [data-field="roles"]')].filter(b => b.checked).map(b => b.value).join(','); return; }
    if (S.dlg.kind === 'agent' && f.dataset.field === 'kind') { d.kind = f.value; render(); return; }
    const v = f.dataset.type === 'bool' ? f.value === 'true' : (f.type === 'checkbox' ? f.checked : f.value);
    d[f.dataset.field] = v; if ((S.dlg.kind === 'csv' || S.dlg.kind === 'orgcsv') && f.dataset.field === 'text') d.rows = null;
    if (f.tagName === 'SELECT' && S.dlg.kind === 'member' && f.dataset.field === 'role') render();
    return;
  }
  if (f && S.editScenario) {
    const d = S.editScenario.draft;
    if (f.dataset.field.startsWith('agents.') || f.dataset.field.startsWith('personas.')) {
      const [list, idx, key] = f.dataset.field.split('.'); const g = d[list][Number(idx)];
      if (g && key === 'agentRef') { const a = f.value ? agentById(f.value) : null; g.agentRef = a ? a.id : ''; if (a) { g.name = a.name; g.embed = `<iframe src="${a.src}" allow="microphone; autoplay"></iframe>`; } render(); return; }
      if (g) { g[key] = f.value; if (key === 'embed' && g.agentRef) { const a = agentById(g.agentRef); if (a && embedSrc(f.value) !== a.src) g.agentRef = ''; } if (f.tagName === 'SELECT') render(); }
      return;
    }
    if (f.dataset.field.startsWith('eval.')) {
      const key = f.dataset.field.slice(5);
      if (key === 'agentRef') { const a = f.value ? agentById(f.value) : null; d.eval.agentRef = a ? a.id : ''; if (a) { d.eval.name = a.name; d.eval.workflow = a.workflow; } render(); return; }
      d.eval[key] = f.type === 'checkbox' ? f.checked : f.value; if (key === 'workflow' && d.eval.agentRef) { const a = agentById(d.eval.agentRef); if (a && a.workflow !== f.value) d.eval.agentRef = ''; } if (f.tagName === 'SELECT') render(); return;
    }
    if (f.dataset.field === 'cat') { applyCatToDraft(S.editScenario, f.value); render(); return; }
    if (f.dataset.field === 'diffs') { toggleDraftDiff(S.editScenario, f.value, f.checked); render(); return; }
    d[f.dataset.field] = f.value;
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'hubsearch' || el.dataset.act === 'globalsearch') { S.hubSearch = el.value; render(); }
  else if (el.dataset.act === 'recsearch') { S.recSearch = el.value; render(); }
  else if (el.dataset.act === 'memsearch') { S.memberSearch = el.value; render(); }
  else if (el.dataset.act === 'auditsearch') { S.auditFilter.q = el.value; render(); }
  else if (el.dataset.act === 'agentscn') { S.agentScn = el.value; render(); }
});

document.addEventListener('change', e => {
  const rg = e.target.closest('[data-range]');
  if (rg) { S.range[rg.dataset.range] = rg.value; render(); return; }
  const af = e.target.closest('[data-audit]');
  if (af) { S.auditFilter[af.dataset.audit] = af.value; render(); return; }
  const rp = e.target.closest('[data-roleperm]');
  if (rp) { const [role, key] = rp.dataset.roleperm.split(':'); setRolePerm(role, key, rp.type === 'checkbox' ? rp.checked : rp.value); return; }
  const file = e.target.closest('[data-file="csv"],[data-file="orgcsv"]');
  if (file && file.files && file.files[0] && S.dlg) { const fr = new FileReader(); fr.onload = () => { S.dlg.draft.text = String(fr.result || ''); if (file.dataset.file === 'orgcsv') orgCsvParse(); else csvParse(); }; fr.readAsText(file.files[0], 'utf-8'); return; }
  const f = e.target.closest('[data-field]'); if (f) e.target.dispatchEvent(new Event('input', { bubbles: true }));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (S.editScenario || S.dlg)) { S.editScenario = null; S.dlg = null; render(); } });

window.addEventListener('hashchange', () => {
  S.navOpen = false;
  const prev = S.route;
  S.route = parseHash();
  if (prev.name === 'scenario' && prev.tab === 'call' && S.route.tab !== 'call') clearInterval(S.timer);
  if (!(S.route.name === 'scenario' && S.route.tab === 'report')) replayStop(false);
  if (S.route.name === 'scenario') {
    const sc = scenarioById(S.route.sc);
    if (sc && (prev.sc !== S.route.sc || S.personaId == null)) {
      S.personaId = sc.personas[0].id;
      S.difficulty = sc.personas[0].diff;
    }
  }
  render();
  const c = document.querySelector('.content');
  if (c) c.scrollTop = 0;
});

loadParams();
loadCustomScenarios();
applyDeletedScenarios();
loadScenarioOverrides();
SCENARIOS.forEach(s => { ensureAgents(s.id); ensureEval(s.id); });
loadOrgOverrides();
loadAgents();
loadSessions();
S.route = parseHash();
render();
