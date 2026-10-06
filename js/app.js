// 永豐 AI 對練 v1.0.4
// 外框與權限模型沿用 CMC 金牌教練：場景中心 → 工作場景（對練記錄／對練／統計）→ 系統設定。
// 對練畫面沿用永豐 v1.0.3 原型；示範場景改為信貸電銷（複訪／議價）與客服話務（銀行／信用卡），複盤維度依應用的評分 schema。
'use strict';

import { SCENARIOS, TRANSCRIPTS, REPORT_CONTENT, OVERALL_DIMS, ANALYTICS } from './data.js';
import { ROLES, ORG, UNITS, MEMBERS, DEMO_ACCOUNTS, memberById, visibleMemberIds,
         scopeLabel, CAN, AUDIT, SCENARIO_META, SESSIONS } from './org.js';

const VERSION = 'v1.0.4';
const AT = [0, 22, 54, 82, 108, 132, 180, 208, 216, 248, 300, 336];

/* ------------------------------------------------------------------ state */
const S = {
  user: null,
  route: { name: 'hub' },
  collapsed: false,
  hubCat: 'all', hubSearch: '',
  personaId: null, difficulty: 'L2',
  reveal: 0, elapsed: 0, confirmEnd: false, timer: null,
  recSearch: '', statGran: '月', settingsTab: 'list', memberTab: 'members',
  liveSession: null,
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
const scoreCol = v => v >= 85 ? '#1E9E63' : v >= 75 ? '#E0882E' : '#D81E26';
const grade = v => v >= 90 ? '優秀' : v >= 80 ? '良好' : v >= 70 ? '合格' : '待提升';

/* ------------------------------------------------------------------ icons */
const I = {
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
    ? `<div class="nav-group">統計測量</div>
       ${navItem('#/me', I.chart, '我的數據', { on: r.name === 'me' })}
       ${navItem('#/insights', I.clock, '洞察分析', { on: r.name === 'insights' })}`
    : `<div class="nav-group">統計測量</div>${navItem('#/me', I.chart, '我的數據', { on: r.name === 'me' })}`;

  const sysGroup = CAN.settings(S.user)
    ? `<div class="nav-group">系統設定</div>
       ${navItem('#/sys/scenarios', I.cog, '場景設定', { on: r.name === 'sys' && r.tab === 'scenarios' })}
       ${navItem('#/sys/members', I.people, '成員權限', { on: r.name === 'sys' && r.tab === 'members', badge: MEMBERS.length })}
       ${navItem('#/sys/audit', I.clock, '操作記錄', { on: r.name === 'sys' && r.tab === 'audit' })}`
    : (CAN.scenarioSettings(S.user)
        ? `<div class="nav-group">系統設定</div>${navItem('#/sys/scenarios', I.cog, '場景設定', { on: r.name === 'sys' && r.tab === 'scenarios' })}`
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
      <div class="side-ver">SinoPac AI Coach ${VERSION} · PoC</div>
      <button class="side-collapse" data-act="collapse">
        ${svg(S.collapsed ? I.right : I.left, 17)}<span class="lbl">收合側欄</span>
      </button>
    </div>
  </aside>`;
}

function viewTopbar() {
  const u = S.user;
  return `<div class="topbar">
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
  const rows = sessionsFor(sc.id).filter(r =>
    !q || (r.pe + r.id + (memberById(r.member) || {}).name).toLowerCase().includes(q));

  const head = full
    ? '<th>對練時間</th><th>客戶畫像</th><th>難度</th><th>對練ID</th><th>理專</th><th>所屬單位</th><th>時長</th><th class="num">狀態／得分</th>'
    : '<th>對練時間</th><th>客戶畫像</th><th>難度</th><th>對練ID</th><th>時長</th><th class="num">狀態／得分</th>';

  const body = rows.map(r => {
    const m = memberById(r.member) || {};
    const d = DIFF[r.diff];
    const status = r.status === 'done'
      ? `<b class="mono" style="color:${scoreCol(r.score)};font-size:14px">${r.score}</b>
         <span class="pill" style="color:${scoreCol(r.score)};background:${scoreCol(r.score)}1f;margin-left:7px">${grade(r.score)}</span>`
      : r.status === 'evaluating'
        ? '<span class="pill" style="color:#B5740F;background:#FBEFD9">正在評估中</span>'
        : '<span class="pill" style="color:#667085;background:#F4F7F8">暫無評分</span>';
    const mid = full
      ? `<td>${esc(m.name || '—')}</td><td>${esc(UNITS[m.unit] || '—')}</td>`
      : '';
    return `<tr class="${r.status === 'done' ? 'clickable' : ''}"
        ${r.status === 'done' ? `data-act="goto" data-arg="#/s/${sc.id}/report/${r.id}"` : ''}>
      <td class="mono">${esc(r.date)}</td>
      <td><b>${esc(r.pe)}</b></td>
      <td><span class="pill" style="color:${d.col};background:${d.col}1f">${d.cn}</span></td>
      <td class="mono" style="color:var(--muted);font-size:12px">${esc(r.id)}</td>
      ${mid}
      <td class="mono">${esc(r.dur)}</td>
      <td class="num">${status}</td>
    </tr>`;
  }).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>對練記錄</h1><p>${esc(sc.desc)}</p></div>
    <div class="filters">
      <button class="btn-primary" data-act="goto" data-arg="#/s/${sc.id}/new">${svg(I.play, 16)}發起對練</button>
      <div class="inp" style="margin-left:auto">${svg(I.search, 15)}
        <input placeholder="搜尋客戶畫像或對練ID…" data-act="recsearch" data-keep-focus="recsearch" value="${esc(S.recSearch)}"></div>
    </div>
    <div class="card">
      ${rows.length ? `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
                    : '<div class="empty">這個場景還沒有對練記錄。按「發起對練」開始第一場。</div>'}
      <div class="tbl-foot">共 ${rows.length} 筆　·　${esc(scopeLabel(S.user))}</div>
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
    <div class="page-h"><h1>發起對練</h1><p>你的角色：<b>${esc(sc.youRole.cn)}</b>　·　預計時長 ${esc(sc.duration)}　·　${esc(SCENARIO_META[sc.id].agent)}</p></div>
    <h2 style="font-family:'Noto Sans TC';font-size:16px;font-weight:700;margin-bottom:14px">選擇客戶畫像</h2>
    <div class="grid3" style="margin-bottom:28px">${personas}</div>
    <h2 style="font-family:'Noto Sans TC';font-size:16px;font-weight:700;margin-bottom:6px">調整對練難度</h2>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">預設沿用客戶畫像的難度，可依訓練目標調整。</p>
    <div style="display:flex;gap:14px">${diffs}</div>
    <div class="actionbar">
      <div class="fields">
        <div class="f"><div class="l">客戶畫像</div><div class="v">${esc(sel.name)}</div></div>
        <div class="vr"></div>
        <div class="f"><div class="l">難度</div><div class="v" style="color:${sd.col}">${sd.cn}</div></div>
      </div>
      <button class="btn-primary" data-act="startcall">${svg(I.play, 17)}開始對練</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 場景：對練中 */
function viewCall(sc) {
  const p = curPersona(sc);
  const lines = transcriptFor(sc.id);
  const vis = lines.slice(0, S.reveal);
  const last = vis[vis.length - 1] || lines[0];
  const emo = last.emo;
  const emoLabel = emo < 42 ? '抵觸 · 緊張' : emo < 66 ? '猶豫 · 中性' : '認可 · 積極';
  const emoCol = emo < 42 ? '#D81E26' : emo < 66 ? '#E0882E' : '#009E96';

  let tipLine = null;
  for (let i = vis.length - 1; i >= 0; i--) if (vis[i].tip) { tipLine = vis[i]; break; }
  const FLAG = {
    compliance: { c: '#D81E26', l: '合規紅線 · Compliance' },
    risk:       { c: '#E0882E', l: '情緒預警 · Alert' },
    win:        { c: '#009E96', l: '成交訊號 · Closing' },
  };
  const fk = (tipLine && tipLine.flag) ? FLAG[tipLine.flag] : { c: '#D81E26', l: '話術建議 · Suggestion' };
  const speaking = last.who;

  const body = vis.map(l => `<div class="call-line ${l.who}">${esc(l.t)}</div>`).join('');
  const sd = DIFF[S.difficulty];

  const modal = S.confirmEnd ? `<div class="modal-bg">
    <div class="modal">
      <div class="ic" style="color:var(--red)">${svg(I.warn, 22)}</div>
      <h3>結束本次對練？</h3>
      <p>結束後將生成對練記錄並開始評分。</p>
      <div class="row">
        <button class="btn-ghost" data-act="cancelend" style="justify-content:center">繼續對練</button>
        <button data-act="doend" style="background:linear-gradient(145deg,#E5342B,#C00E1A);color:#fff">結束對練並評分</button>
      </div>
    </div></div>` : '';

  return `<div class="call">
    <div class="call-top">
      <div class="l">
        <button class="call-back" data-act="askend">${svg(I.back, 16)}返回</button>
        <span class="rec"><i></i><b>REC</b></span>
        <span style="font-size:12.5px;color:#9FC4BD">${esc(sc.cn)}</span>
      </div>
      <div class="call-timer">${fmt(S.elapsed)}</div>
      <div class="r"><span style="font-size:12px;color:#7FA59E">難度 <b style="color:#EAF2F1">${sd.cn}</b></span></div>
    </div>
    <div class="call-body">
      <div class="call-rail">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="avatar-wrap">
            ${speaking === 'cust' ? '<span class="avatar-ring"></span><span class="avatar-ring b"></span>' : ''}
            <div class="avatar-disc"><div style="background:${p.col}">${esc(p.init)}</div></div>
            <div class="avatar-tag">${esc(p.name.split('·').pop().trim())}</div>
          </div>
          <div class="emo"><i style="background:${emoCol}"></i>客戶情緒 · ${emoLabel}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="avatar-wrap">
            ${speaking === 'agent' ? '<span class="avatar-ring"></span><span class="avatar-ring b"></span>' : ''}
            <div class="avatar-disc"><div style="background:radial-gradient(circle at 50% 38%,#0F1C1E,#04090A)">
              <svg width="54" height="54" viewBox="0 0 48 48" fill="none"><path d="M14 10h20a6 6 0 016 6v9a6 6 0 01-6 6H22l-8 6.5V31a6 6 0 01-6-6v-9a6 6 0 016-6z" stroke="#4DA3FF" stroke-width="2.4" stroke-linejoin="round"/></svg>
            </div></div>
            <div class="avatar-tag">你 · ${esc(S.user.name)}</div>
          </div>
        </div>
      </div>
      <div class="call-right">
        <div class="tip" style="border:1px solid ${fk.c}66">
          <i style="background:${fk.c}"></i><b style="color:${fk.c}">${fk.l}</b>
          <span>${esc(tipLine ? tipLine.tip : '對練進行中…')}</span>
        </div>
        <div class="call-lines" id="call-lines">${body}</div>
        <div style="display:flex;justify-content:center"><button class="speak-pill" data-act="noop">說話或打斷</button></div>
        <div class="call-ctl">
          <button class="ctl" data-act="noop">${svg(I.globe, 21)}</button>
          <button class="ctl end" data-act="askend">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(135deg)"><path d="M6.62 10.79a15 15 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.4 11.4 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.57 3.58 1 1 0 01-.25 1.02z"/></svg>
          </button>
          <button class="ctl" data-act="noop">${svg(I.doc, 21)}</button>
        </div>
      </div>
    </div>
    ${modal}
  </div>`;
}

/* ------------------------------------------------------------------ 場景：複盤報告 */
function viewReport(sc, sessionId) {
  const session = SESSIONS.find(s => s.id === sessionId) || S.liveSession;
  if (!session) return `<div class="wrap"><div class="card empty">找不到這筆對練記錄。</div></div>`;

  const rc = reportFor(sc.id);
  const overall = session.score == null ? 86 : session.score;
  const d = DIFF[session.diff];
  const m = memberById(session.member) || S.user;
  const C = 2 * Math.PI * 68;

  const dims = rc.dims.map(x => `<div class="dim">
    <div class="hd"><div><span class="cn">${esc(x.cn)}</span><span class="en">${esc(x.en)}</span></div>
      <span class="sc" style="color:${scoreCol(x.score)}">${x.score}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${x.score}%;background:linear-gradient(90deg,${scoreCol(x.score)}99,${scoreCol(x.score)})"></div></div>
    <div class="note">${esc(x.note)}</div></div>`).join('');

  const lines = replayLines(sc.id).map(l => `<div class="replay-line">
      <span class="t mono">${fmt(l.at)}</span>
      <span class="sp" style="color:${l.who === 'cust' ? 'var(--ink2)' : 'var(--blue)'}">${l.who === 'cust' ? esc(session.pe.split('·').pop().trim()) : esc(m.name)}</span>
      <span class="tx">${esc(l.text)}</span></div>`).join('');

  return `<div class="wrap">
    <div class="card report-hero" style="margin-bottom:18px">
      <div class="meta">
        <h1>對練複盤報告</h1>
        <div class="chips">
          <span class="chip">${esc(sc.cn)}</span>
          <span class="chip">客戶：${esc(session.pe)}</span>
          <span class="chip" style="color:${d.col};background:${d.col}1f;border-color:${d.col}33">${d.cn}難度</span>
          <span class="chip">理專：${esc(m.name)}</span>
        </div>
        <div class="stats">
          <div><div class="v">${esc(session.dur)}</div><div class="l">對練時長</div></div>
          <div><div class="v">1,284</div><div class="l">對話字數</div></div>
          <div><div class="v" style="color:var(--red)">1</div><div class="l">合規提醒</div></div>
          <div><div class="v" style="font-size:14px;color:var(--muted)">${esc(session.date)}</div><div class="l">完成時間</div></div>
        </div>
      </div>
      <div class="ring-wrap">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="68" fill="none" stroke="var(--line2)" stroke-width="11"/>
          <circle cx="75" cy="75" r="68" fill="none" stroke="${scoreCol(overall)}" stroke-width="11" stroke-linecap="round"
            stroke-dasharray="${(C * overall / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 75 75)"/>
        </svg>
        <div class="num"><b style="color:${scoreCol(overall)}">${overall}</b><s>／100</s>
          <s style="color:${scoreCol(overall)};font-weight:700;margin-top:6px">${grade(overall)}</s></div>
      </div>
    </div>

    <div class="grid2" style="margin-bottom:18px;align-items:start">
      <div class="card"><div class="card-h"><h2>能力維度評分</h2><div class="sub">COMPETENCY BREAKDOWN</div></div>
        <div class="card-b">${dims}</div></div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="list-good"><h3>${svg(I.check, 16)}表現亮點</h3><ul>${rc.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="list-bad"><h3>${svg(I.warn, 16)}待提升項</h3><ul>${rc.improves.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
    </div>

    <div class="card"><div class="card-h"><h2>記錄詳情</h2><div class="sub">TRANSCRIPT</div></div>
      <div class="card-b">${lines}</div></div>

    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="btn-ghost" data-act="goto" data-arg="#/s/${sc.id}/records">返回對練記錄</button>
      <button class="btn-primary" data-act="goto" data-arg="#/s/${sc.id}/new">${svg(I.play, 16)}再次對練</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 場景：統計（主管模組） */
function viewScenarioStats(sc) {
  const rows = sessionsFor(sc.id);
  const done = rows.filter(r => r.status === 'done');
  const avg = done.length ? (done.reduce((a, b) => a + b.score, 0) / done.length) : 0;
  const gran = ['日', '週', '月', '季', '年'].map(g =>
    `<button class="${S.statGran === g ? 'on' : ''}" data-act="gran" data-arg="${g}">${g}</button>`).join('');

  const byPersona = {};
  rows.forEach(r => { byPersona[r.pe] = (byPersona[r.pe] || 0) + 1; });
  const maxP = Math.max(1, ...Object.values(byPersona));
  const personaBars = Object.entries(byPersona).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v}</span></div>
     <div class="bar-track"><div class="bar-fill" style="width:${v / maxP * 100}%;background:linear-gradient(90deg,#EE6A60,#D81E26)"></div></div></div>`).join('');

  const byMember = {};
  rows.forEach(r => { const n = (memberById(r.member) || {}).name || '—'; byMember[n] = (byMember[n] || 0) + 1; });
  const maxM = Math.max(1, ...Object.values(byMember));
  const memberBars = Object.entries(byMember).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v}</span></div>
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
    <div class="filters"><div class="seg">${gran}</div></div>
    <div class="kpis">
      ${kpi('練', '對練場次', rows.length, '選定區間', '#D81E26')}
      ${kpi('完', '已完成', done.length, `待評 ${rows.length - done.length}`, '#1E9E63')}
      ${kpi('分', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 份評分`, '#E0882E')}
      ${kpi('人', '參與人數', new Set(rows.map(r => r.member)).size, '有對練記錄', '#2D6CC0')}
    </div>
    <div class="grid2" style="margin-bottom:18px;align-items:start">
      <div class="card"><div class="card-h"><h2>客戶畫像分布</h2><div class="sub">共 ${rows.length} 筆</div></div><div class="card-b">${personaBars || '<div class="empty">尚無資料</div>'}</div></div>
      <div class="card"><div class="card-h"><h2>理專分布</h2><div class="sub">共 ${rows.length} 筆</div></div><div class="card-b">${memberBars || '<div class="empty">尚無資料</div>'}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>最近對練</h2><div class="sub">選定範圍內的對練場次</div></div>
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
  const a = ANALYTICS;
  const mine = SESSIONS.filter(s => s.member === S.user.id);
  const done = mine.filter(s => s.status === 'done');
  const avg = done.length ? (done.reduce((x, y) => x + y.score, 0) / done.length) : 0;

  const W = 620, H = 200, padX = 22, padTop = 16, padBot = 30, n = a.trend.length;
  const xs = i => padX + i * ((W - 2 * padX) / (n - 1));
  const ys = v => padTop + (1 - (v - 65) / 30) * (H - padTop - padBot);
  const pts = a.trend.map((t, i) => [xs(i), ys(t.v)]);
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `M${pts[0][0].toFixed(1)},${H - padBot} ` + pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${pts[n - 1][0].toFixed(1)},${H - padBot} Z`;
  const dots = a.trend.map((t, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(t.v).toFixed(1)}" r="3.6" fill="#fff" stroke="#D81E26" stroke-width="2"/>
    <text x="${xs(i).toFixed(1)}" y="${H - padBot + 16}" fill="#7C8992" font-size="10" text-anchor="middle">${esc(t.l)}</text>`).join('');

  const cx = 160, cy = 115, R = 82, dn = OVERALL_DIMS.length;
  const ang = i => (-90 + i * (360 / dn)) * Math.PI / 180;
  const poly = OVERALL_DIMS.map((d, i) => { const r = R * d.score / 100; return `${(cx + r * Math.cos(ang(i))).toFixed(1)},${(cy + r * Math.sin(ang(i))).toFixed(1)}`; }).join(' ');
  const rings = [0.34, 0.67, 1].map(f => `<polygon points="${OVERALL_DIMS.map((d, i) => `${(cx + R * f * Math.cos(ang(i))).toFixed(1)},${(cy + R * f * Math.sin(ang(i))).toFixed(1)}`).join(' ')}" fill="none" stroke="#E2E8EA"/>`).join('');
  const axes = OVERALL_DIMS.map((d, i) => {
    const lx = cx + (R + 20) * Math.cos(ang(i)), ly = cy + (R + 20) * Math.sin(ang(i));
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(ang(i))).toFixed(1)}" y2="${(cy + R * Math.sin(ang(i))).toFixed(1)}" stroke="#E2E8EA"/>
      <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" fill="#56646D" font-size="11" text-anchor="${lx < cx - 4 ? 'end' : lx > cx + 4 ? 'start' : 'middle'}">${esc(d.cn)}</text>`;
  }).join('');

  const distMax = Math.max(...a.dist.map(d => d.n));
  const dist = a.dist.map(d => `<div class="bar-row"><div class="lb"><span>${esc(d.cn)}</span><span>${d.n} 次</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${(d.n / distMax * 100).toFixed(0)}%;background:linear-gradient(90deg,${d.col}99,${d.col})"></div></div></div>`).join('');

  const recent = mine.slice(0, 6).map(r => {
    const sc = scenarioById(r.sc) || {};
    return `<tr class="clickable" data-act="goto" data-arg="#/s/${r.sc}/report/${r.id}">
      <td><b>${esc(sc.cn || r.sc)}</b></td><td>${esc(r.pe)}</td><td class="mono">${esc(r.date)}</td>
      <td class="num">${r.status === 'done' ? `<b class="mono" style="color:${scoreCol(r.score)}">${r.score}</b>` : '—'}</td></tr>`;
  }).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>我的數據</h1><p>${esc(S.user.name)}　·　${esc(UNITS[S.user.unit])}　·　只顯示你自己的對練成績。</p></div>
    <div class="kpis">
      ${kpi('練', '累計對練', mine.length, `本月 +${Math.min(mine.length, 3)}`, '#D81E26')}
      ${kpi('分', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 場已評分`, '#E0882E')}
      ${kpi('時', '練習時長', a.kpis[2].val, a.kpis[2].sub, '#009E96')}
      ${kpi('達', '達標率', a.kpis[3].val, a.kpis[3].sub, '#2D6CC0')}
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-bottom:18px;align-items:start">
      <div class="card"><div class="card-h"><h2>得分趨勢</h2><div class="sub">SCORE TREND</div></div>
        <div class="card-b"><svg viewBox="0 0 620 200" style="width:100%;height:auto">
          <defs><linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D81E26" stop-opacity=".22"/><stop offset="100%" stop-color="#D81E26" stop-opacity="0"/></linearGradient></defs>
          <line x1="22" y1="44" x2="598" y2="44" stroke="#EDF1F2"/><line x1="22" y1="92" x2="598" y2="92" stroke="#EDF1F2"/><line x1="22" y1="140" x2="598" y2="140" stroke="#EDF1F2"/>
          <path d="${area}" fill="url(#tf)"/>
          <polyline points="${line}" fill="none" stroke="#D81E26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
        </svg></div></div>
      <div class="card"><div class="card-h"><h2>能力雷達</h2><div class="sub">COMPETENCY RADAR</div></div>
        <div class="card-b"><svg viewBox="0 0 320 250" style="width:100%;height:auto">
          ${rings}${axes}<polygon points="${poly}" fill="rgba(0,158,150,.2)" stroke="#009E96" stroke-width="2"/>
        </svg></div></div>
    </div>
    <div class="grid2" style="align-items:start">
      <div class="card"><div class="card-h"><h2>場景練習分布</h2><div class="sub">SCENARIO DISTRIBUTION</div></div><div class="card-b">${dist}</div></div>
      <div class="card"><div class="card-h"><h2>我的最近對練</h2><div class="sub">RECENT SESSIONS</div></div>
        ${mine.length ? `<table class="tbl" style="margin-top:12px"><thead><tr><th>場景</th><th>客戶畫像</th><th>日期</th><th class="num">得分</th></tr></thead><tbody>${recent}</tbody></table>`
                      : '<div class="empty">你還沒有對練記錄。</div>'}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ 洞察分析（主管模組） */
function viewInsights() {
  const rows = visibleSessions();
  const done = rows.filter(r => r.status === 'done');
  const avg = done.length ? done.reduce((a, b) => a + b.score, 0) / done.length : 0;
  const ids = visibleMemberIds(S.user);
  const people = MEMBERS.filter(m => ids.includes(m.id));

  const unitAgg = {};
  rows.forEach(r => {
    const m = memberById(r.member); if (!m) return;
    const u = unitAgg[m.unit] || (unitAgg[m.unit] = { n: 0, sum: 0, scored: 0 });
    u.n++; if (r.status === 'done') { u.sum += r.score; u.scored++; }
  });
  const unitRows = Object.entries(unitAgg).sort((a, b) => (b[1].scored ? b[1].sum / b[1].scored : 0) - (a[1].scored ? a[1].sum / a[1].scored : 0))
    .map(([u, v], i) => {
      const s = v.scored ? v.sum / v.scored : 0;
      return `<div class="bar-row"><div class="lb">
        <span><b style="color:var(--ink)">${i + 1}. ${esc(UNITS[u] || u)}</b>　<span style="color:var(--muted)">${v.n} 場</span></span>
        <span style="color:${scoreCol(s)};font-weight:700">${s ? s.toFixed(1) : '—'}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${s ? s : 0}%;background:linear-gradient(90deg,${scoreCol(s)}99,${scoreCol(s)})"></div></div></div>`;
    }).join('');

  const buckets = [['優秀（90 分以上）', '#1E9E63', r => r.score >= 90], ['良好（80–89 分）', '#2D6CC0', r => r.score >= 80 && r.score < 90],
                   ['合格（70–79 分）', '#E0882E', r => r.score >= 70 && r.score < 80], ['待提升（70 分以下）', '#D81E26', r => r.score < 70]];
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
    return { m, n: rows.filter(r => r.member === m.id).length, s };
  }).sort((a, b) => b.s - a.s).map((x, i) => `<tr>
      <td class="mono" style="color:var(--muted)">${i + 1}</td>
      <td><b>${esc(x.m.name)}</b>${x.m.id === S.user.id ? ' <span class="pill" style="color:var(--red);background:var(--red-soft)">我</span>' : ''}</td>
      <td>${esc(UNITS[x.m.unit])}</td><td>${esc(ROLES[x.m.role].cn)}</td>
      <td class="mono">${x.n}</td>
      <td class="num"><b class="mono" style="color:${scoreCol(x.s)}">${x.s ? x.s.toFixed(1) : '—'}</b></td></tr>`).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>洞察分析 <span class="tag-mgr">主管模組</span></h1><p>跨場景的團隊表現：依組織層級彙總。</p></div>
    <div class="scope-note">${esc(scopeLabel(S.user))}</div>
    <div class="kpis">
      ${kpi('均', '平均得分', avg ? avg.toFixed(1) : '—', `${done.length} 場已評分`, '#D81E26')}
      ${kpi('場', '對練場次', rows.length, `${rows.length - done.length} 場待評`, '#2D6CC0')}
      ${kpi('人', '覆蓋人數', new Set(rows.map(r => r.member)).size, `可視成員 ${people.length} 人`, '#009E96')}
      ${kpi('景', '涵蓋場景', new Set(rows.map(r => r.sc)).size, `共 ${SCENARIOS.length} 個場景`, '#6A5BC4')}
    </div>
    <div class="grid2" style="margin-bottom:18px;align-items:start">
      <div class="card"><div class="card-h"><h2>單位對比</h2><div class="sub">依平均得分排序</div></div><div class="card-b">${unitRows || '<div class="empty">尚無資料</div>'}</div></div>
      <div class="card"><div class="card-h"><h2>得分分級分布</h2><div class="sub">共 ${done.length} 場已評分</div></div><div class="card-b">${distRows}</div></div>
    </div>
    <div class="card"><div class="card-h"><h2>人員排行</h2><div class="sub">可視範圍內的成員</div></div>
      <table class="tbl" style="margin-top:12px"><thead><tr><th>#</th><th>姓名</th><th>所屬單位</th><th>角色</th><th>對練</th><th class="num">平均分</th></tr></thead>
      <tbody>${board}</tbody></table>
      <div class="tbl-foot">${esc(scopeLabel(S.user))}</div></div>
  </div>`;
}

/* ------------------------------------------------------------------ 系統設定 */
function viewSysScenarios() {
  const tabs = [['list', '場景清單'], ['agent', 'Agent 配置']].map(([k, l]) =>
    `<button class="${S.settingsTab === k ? 'on' : ''}" data-act="settab" data-arg="${k}">${l}</button>`).join('');

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
            <div style="font-size:11.5px;color:var(--muted)">可用畫面：對練記錄・對練・統計　｜　版本 ${esc(meta.ver)}　｜　維護人 ${esc(meta.owner)}　｜　客戶畫像 ${s.personas.length} 個</div>
          </div>
          <button class="btn-ghost" data-act="noop">編輯</button>
        </div>`;
      }).join('')
    : `<div class="card"><table class="tbl">
        <thead><tr><th>場景</th><th>對練 Agent</th><th>你的角色</th><th>預計時長</th><th class="num">狀態</th></tr></thead>
        <tbody>${SCENARIOS.map(s => {
          const meta = SCENARIO_META[s.id];
          return `<tr><td><b>${esc(s.cn)}</b></td>
            <td class="mono" style="font-size:12px;color:var(--muted)">${esc(meta.agent)}</td>
            <td>${esc(s.youRole.cn)}</td><td class="mono">${esc(s.duration)}</td>
            <td class="num"><span class="pill" style="color:${meta.status === 'on' ? '#1E9E63' : '#7C8992'};background:${meta.status === 'on' ? '#EAF8F2' : '#F4F7F8'}">${meta.status === 'on' ? '已啟用' : '未啟用'}</span></td></tr>`;
        }).join('')}</tbody></table></div>`;

  return `<div class="wrap">
    <div class="page-h"><h1>場景設定</h1><p>維護工作場景與對練 Agent；啟用後會出現在左側「工作場景」與場景中心。</p></div>
    <div class="tabs">${tabs}</div>${body}</div>`;
}

function viewSysMembers() {
  const tabs = [['members', '成員管理'], ['roles', '角色管理'], ['org', '組織管理']].map(([k, l]) =>
    `<button class="${S.memberTab === k ? 'on' : ''}" data-act="memtab" data-arg="${k}">${l}</button>`).join('');

  let body = '';
  if (S.memberTab === 'members') {
    body = `<div class="card"><table class="tbl">
      <thead><tr><th>名稱</th><th>電子郵箱</th><th>角色</th><th>所屬單位</th><th>加入時間</th><th class="num">狀態</th></tr></thead>
      <tbody>${MEMBERS.map(m => `<tr>
        <td><span style="display:inline-flex;align-items:center;gap:9px">
          <span style="width:28px;height:28px;border-radius:50%;background:${m.col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${esc(m.name[0])}</span>
          <b>${esc(m.name)}</b></span></td>
        <td style="color:var(--muted);font-size:12.5px">${esc(m.email)}</td>
        <td><span class="pill" style="color:var(--blue);background:#EDF3FB">${esc(ROLES[m.role].cn)}</span></td>
        <td>${esc(UNITS[m.unit])}</td><td class="mono">${esc(m.joined)}</td>
        <td class="num"><span class="pill" style="color:${m.active ? '#1E9E63' : '#7C8992'};background:${m.active ? '#EAF8F2' : '#F4F7F8'}">${m.active ? '啟用' : '停用'}</span></td>
      </tr>`).join('')}</tbody></table>
      <div class="tbl-foot">共 ${MEMBERS.length} 位成員</div></div>`;
  } else if (S.memberTab === 'roles') {
    body = `<div class="card"><table class="tbl">
      <thead><tr><th>角色</th><th>資料範圍</th><th>可用導覽</th><th class="num">成員數</th></tr></thead>
      <tbody>${Object.keys(ROLES).map(k => {
        const r = ROLES[k];
        const fake = { role: k, unit: 'wm1', id: 'x' };
        const navs = ['工作場景'];
        navs.push(CAN.stats(fake) ? '統計測量（我的數據・洞察分析）' : '統計測量（我的數據）');
        if (CAN.settings(fake)) navs.push('系統設定（全部）');
        else if (CAN.scenarioSettings(fake)) navs.push('系統設定（場景設定）');
        const scope = { all: '全行', team: '本人與下屬', self: '僅本人' }[r.scope];
        return `<tr><td><b>${esc(r.cn)}</b> <span class="mono" style="color:var(--faint);font-size:11px">${k}</span></td>
          <td><span class="pill" style="color:var(--purple);background:#F1EAFE">${scope}</span></td>
          <td style="font-size:12.5px;color:var(--body)">${esc(navs.join('　·　'))}</td>
          <td class="num mono">${MEMBERS.filter(m => m.role === k).length}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  } else {
    const node = (n, depth) => {
      const count = MEMBERS.filter(m => m.unit === n.id).length;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;padding-left:${14 + depth * 26}px;border-bottom:1px solid var(--line2)">
        <span style="font-size:13.5px;font-weight:${depth === 0 ? 700 : 600}">${esc(n.name)}</span>
        <span class="mono" style="font-size:11px;color:var(--faint)">${esc(n.code)}</span>
        ${count ? `<span class="pill" style="margin-left:auto;color:var(--blue);background:#EDF3FB">${count} 位成員</span>` : ''}
      </div>` + (n.children || []).map(c => node(c, depth + 1)).join('');
    };
    body = `<div class="card">${node(ORG, 0)}<div class="tbl-foot">四層組織：事業群 → 處 → 單位 → 理專。主管的可視範圍為所屬「處」底下所有單位。</div></div>`;
  }

  return `<div class="wrap">
    <div class="page-h"><h1>成員權限</h1><p>管理系統成員、角色權限與組織配置。角色直接決定導覽與資料範圍。</p></div>
    <div class="tabs">${tabs}</div>${body}</div>`;
}

function viewSysAudit() {
  const mods = {}; AUDIT.forEach(a => { mods[a.mod] = (mods[a.mod] || 0) + 1; });
  const maxMod = Math.max(...Object.values(mods));
  const bars = Object.entries(mods).map(([k, v]) =>
    `<div class="bar-row"><div class="lb"><span>${esc(k)}</span><span>${v}</span></div>
     <div class="bar-track"><div class="bar-fill" style="width:${v / maxMod * 100}%;background:linear-gradient(90deg,#9485D2,#6A5BC4)"></div></div></div>`).join('');

  return `<div class="wrap">
    <div class="page-h"><h1>操作記錄</h1><p>系統與成員的操作軌跡。</p></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      ${kpi('總', '總操作數', AUDIT.length, '全部記錄', '#6A5BC4')}
      ${kpi('日', '今日操作', 1, '2026/10/01', '#2D6CC0')}
      ${kpi('人', '操作人數', new Set(AUDIT.map(a => a.who)).size, '不重複', '#009E96')}
    </div>
    <div class="grid2" style="align-items:start">
      <div class="card"><div class="card-h"><h2>依模組統計</h2><div class="sub">共 ${AUDIT.length} 筆</div></div><div class="card-b">${bars}</div></div>
      <div class="card"><div class="card-h"><h2>操作軌跡</h2><div class="sub">最新在前</div></div>
        <table class="tbl" style="margin-top:12px"><tbody>${AUDIT.map(a => `<tr>
          <td class="mono" style="width:140px;font-size:11.5px;color:var(--muted)">${esc(a.at)}</td>
          <td style="width:88px"><span class="pill" style="color:var(--blue);background:#EDF3FB">${esc(a.act)}</span></td>
          <td style="width:70px"><b>${esc(a.who)}</b></td>
          <td style="font-size:12.5px;color:var(--body)">${esc(a.detail)}</td></tr>`).join('')}</tbody></table></div>
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
    const label = { scenarios: '場景設定', members: '成員權限', audit: '操作記錄' }[r.tab] || '場景設定';
    crumb = viewCrumb([{ label: '場景中心', hash: '#/hub' }, { label }], { perm: true, back: '#/hub' });
    const allowed = r.tab === 'scenarios' ? CAN.scenarioSettings(S.user) : CAN.settings(S.user);
    content = allowed
      ? (r.tab === 'members' ? viewSysMembers() : r.tab === 'audit' ? viewSysAudit() : viewSysScenarios())
      : viewNoPerm();
  }

  root.innerHTML = `<div class="shell ${S.collapsed ? 'collapsed' : ''}">
    ${viewSidebar()}
    <div class="main">${viewTopbar()}${crumb}<div class="content">${content}</div></div>
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
  S.reveal = 1; S.elapsed = 0; S.confirmEnd = false;
  S.liveSession = {
    id: 'live' + Date.now().toString(16).slice(-10), sc: sc.id, pe: p.name,
    diff: S.difficulty, member: S.user.id, date: '剛剛', dur: '0′00″', score: 86, status: 'done',
  };
  go(`#/s/${sc.id}/call`);
  const lines = transcriptFor(sc.id);
  let tick = 0;
  S.timer = setInterval(() => {
    tick++; S.elapsed++;
    if (tick % 3 === 0 && S.reveal < lines.length) S.reveal++;
    if (S.route.name === 'scenario' && S.route.tab === 'call') render();
    else clearInterval(S.timer);
  }, 1000);
}

function endCall() {
  clearInterval(S.timer);
  const sc = scenarioById(S.route.sc);
  if (S.liveSession) {
    const m = Math.floor(S.elapsed / 60), s = S.elapsed % 60;
    S.liveSession.dur = `${m}′${String(s).padStart(2, '0')}″`;
  }
  S.confirmEnd = false;
  go(`#/s/${sc.id}/report/${S.liveSession ? S.liveSession.id : ''}`);
}

const ACTIONS = {
  login: id => { S.user = memberById(id); go('#/hub'); render(); },
  logout: () => { clearInterval(S.timer); S.user = null; render(); },
  goto: hash => go(hash),
  collapse: () => { S.collapsed = !S.collapsed; render(); },
  hubcat: c => { S.hubCat = c; render(); },
  pickpersona: id => { const sc = scenarioById(S.route.sc); S.personaId = id; const p = curPersona(sc); S.difficulty = p.diff; render(); },
  pickdiff: k => { S.difficulty = k; render(); },
  startcall: () => startCall(),
  askend: () => { S.confirmEnd = true; render(); },
  cancelend: () => { S.confirmEnd = false; render(); },
  doend: () => endCall(),
  gran: g => { S.statGran = g; render(); },
  settab: t => { S.settingsTab = t; render(); },
  memtab: t => { S.memberTab = t; render(); },
  noop: () => {},
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'hubsearch' || act === 'recsearch' || act === 'globalsearch') return;
  const fn = ACTIONS[act];
  if (fn) { e.preventDefault(); fn(el.dataset.arg); }
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'hubsearch' || el.dataset.act === 'globalsearch') { S.hubSearch = el.value; render(); }
  else if (el.dataset.act === 'recsearch') { S.recSearch = el.value; render(); }
});

window.addEventListener('hashchange', () => {
  const prev = S.route;
  S.route = parseHash();
  if (prev.name === 'scenario' && prev.tab === 'call' && S.route.tab !== 'call') clearInterval(S.timer);
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

S.route = parseHash();
render();
