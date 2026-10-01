// 角色、組織、成員與稽核資料
// 權限模型對齊 CMC 金牌教練：角色決定導覽可見範圍與資料範圍，不使用頁面層級的視角切換器。
'use strict';

// scope: all = 全行 · team = 本人與下屬 · self = 僅本人
export const ROLES = {
  OWNER:      { cn: '系統擁有者', scope: 'all',  rank: 5 },
  ADMIN:      { cn: '系統管理員', scope: 'all',  rank: 4 },
  MANAGER:    { cn: '單位主管',   scope: 'team', rank: 3 },
  TRAINER:    { cn: '培訓人員',   scope: 'team', rank: 2 },
  ADVISOR_SR: { cn: '理專｜1年以上', scope: 'self', rank: 1 },
  ADVISOR_JR: { cn: '理專｜未滿1年', scope: 'self', rank: 1 },
};

export const ROLE_ORDER = ['OWNER', 'ADMIN', 'MANAGER', 'TRAINER', 'ADVISOR_SR', 'ADVISOR_JR'];

// 四層組織：事業群 → 處 → 單位 → 理專
export const ORG = {
  id: 'retail', name: '零售銀行事業群', code: 'BG-01',
  children: [
    { id: 'wm', name: '財富管理處', code: 'DIV-11', children: [
      { id: 'wm1', name: '財富管理一部', code: 'U-111' },
      { id: 'wm2', name: '財富管理二部', code: 'U-112' },
    ] },
    { id: 'ch', name: '通路管理處', code: 'DIV-12', children: [
      { id: 'branch', name: '分行通路', code: 'U-121' },
      { id: 'phone', name: '電話金融', code: 'U-122' },
    ] },
    { id: 'pb', name: '私人銀行處', code: 'DIV-13', children: [
      { id: 'pbc', name: '私行中心', code: 'U-131' },
    ] },
  ],
};

export const UNITS = {
  wm1: '財富管理一部', wm2: '財富管理二部',
  branch: '分行通路', phone: '電話金融', pbc: '私行中心',
};

const C = { red: '#D81E26', teal: '#009E96', amber: '#E0882E', blue: '#2D6CC0', purple: '#6A5BC4' };

export const MEMBERS = [
  { id: 'SP-0101', name: '王志豪', email: 'chihhao.wang@sinopac.com', role: 'ADMIN',      unit: 'wm1', col: C.red,    active: true,  joined: '2024-03-11' },
  { id: 'SP-0102', name: '李文君', email: 'wenchun.li@sinopac.com',   role: 'MANAGER',    unit: 'wm1', col: C.blue,   active: true,  joined: '2024-05-20' },
  { id: 'SP-0111', name: '林婉清', email: 'wanching.lin@sinopac.com', role: 'ADVISOR_SR', unit: 'wm1', col: C.teal,   active: true,  joined: '2025-01-06' },
  { id: 'SP-0112', name: '蘇曼',   email: 'man.su@sinopac.com',       role: 'ADVISOR_SR', unit: 'wm2', col: C.amber,  active: true,  joined: '2025-02-17' },
  { id: 'SP-0113', name: '唐悅',   email: 'yueh.tang@sinopac.com',    role: 'ADVISOR_JR', unit: 'wm2', col: C.purple, active: true,  joined: '2026-04-01' },
  { id: 'SP-0121', name: '孔哲',   email: 'che.kung@sinopac.com',     role: 'ADVISOR_SR', unit: 'branch', col: C.blue, active: true,  joined: '2024-11-04' },
  { id: 'SP-0122', name: '范小美', email: 'hsiaomei.fan@sinopac.com', role: 'ADVISOR_JR', unit: 'phone', col: C.red,   active: true,  joined: '2026-06-23' },
  { id: 'SP-0131', name: '鄭思遠', email: 'szuyuan.cheng@sinopac.com', role: 'ADVISOR_SR', unit: 'pbc', col: C.teal,  active: true,  joined: '2023-09-12' },
  { id: 'SP-0132', name: '周立倫', email: 'lilun.chou@sinopac.com',   role: 'TRAINER',    unit: 'pbc', col: C.amber,  active: false, joined: '2025-08-19' },
];

// 登入閘的三個示範身分
export const DEMO_ACCOUNTS = ['SP-0101', 'SP-0102', 'SP-0111'];

export function memberById(id) { return MEMBERS.find(m => m.id === id); }

/** 單位主管可管理的下屬：同一「處」底下所有單位的成員。 */
function unitsUnderSameDivision(unitId) {
  for (const div of ORG.children) {
    if ((div.children || []).some(u => u.id === unitId)) return div.children.map(u => u.id);
  }
  return [unitId];
}

/** 依登入者角色回傳可見的成員 id 清單。 */
export function visibleMemberIds(user) {
  const scope = ROLES[user.role].scope;
  if (scope === 'all') return MEMBERS.map(m => m.id);
  if (scope === 'team') {
    const units = unitsUnderSameDivision(user.unit);
    return MEMBERS.filter(m => units.includes(m.unit)).map(m => m.id);
  }
  return [user.id];
}

export function scopeLabel(user) {
  const scope = ROLES[user.role].scope;
  if (scope === 'all') return '全行範圍：可看到所有事業群、處、單位與理專的對練資料。';
  if (scope === 'team') return '依組織架構顯示本人與下屬的對練場次。';
  return '依權限只顯示你自己的對練場次。';
}

/** 導覽權限。 */
export const CAN = {
  stats:    u => ROLES[u.role].scope !== 'self',   // 場景內「統計」與全域「洞察分析」
  settings: u => ROLES[u.role].rank >= 4,          // 系統設定整組
  scenarioSettings: u => ROLES[u.role].rank >= 2,  // 場景設定（含培訓人員）
};

export const AUDIT = [
  { at: '2026/10/01 11:32', mod: '身分與登入', act: '登入',       who: '王志豪', detail: 'chihhao.wang@sinopac.com' },
  { at: '2026/09/30 16:20', mod: '場景設定',   act: '場景啟用',   who: '王志豪', detail: '信貸-銷售模擬演練 v1.0 已啟用' },
  { at: '2026/09/29 09:41', mod: '成員權限',   act: '新增帳號',   who: '王志豪', detail: '建立 范小美（理專｜未滿1年）' },
  { at: '2026/09/28 14:05', mod: '成員權限',   act: '角色調整',   who: '李文君', detail: '將 周立倫 加入「培訓人員」' },
  { at: '2026/09/27 10:22', mod: '場景設定',   act: '話術更新',   who: '周立倫', detail: '理財商品推薦 話術庫 v1.1 → v1.2' },
  { at: '2026/09/26 08:12', mod: '對練場景',   act: '發起對練',   who: '林婉清', detail: '7394c5d7 理財商品推薦・退休教師 王女士' },
  { at: '2026/09/25 17:48', mod: '對練場景',   act: '完成對練',   who: '蘇曼',   detail: '6c138c62 信用卡逾期催收・已評分（90）' },
];

export const SCENARIO_META = {
  'loan-sales-sim':       { ver: 'v1.0', owner: '周立倫', status: 'on',  agent: 'sinopac-coach-1.0 · wf_loan_sales' },
  'customer-service-sim': { ver: 'v1.0', owner: '周立倫', status: 'on',  agent: 'sinopac-coach-1.0 · wf_service_sim' },
  wealth:                 { ver: 'v1.2', owner: '李文君', status: 'on',  agent: 'sinopac-coach-1.0 · wf_wealth_advisory' },
  collection:             { ver: 'v0.9', owner: '周立倫', status: 'on',  agent: 'sinopac-coach-1.0 · wf_collection' },
  antifraud:              { ver: 'v1.1', owner: '王志豪', status: 'on',  agent: 'sinopac-coach-1.0 · wf_antifraud' },
  complaint:              { ver: 'v0.9', owner: '周立倫', status: 'on',  agent: 'sinopac-coach-1.0 · wf_complaint' },
  onboard:                { ver: 'v0.8', owner: '李文君', status: 'off', agent: 'sinopac-coach-1.0 · wf_onboarding' },
  insurance:              { ver: 'v0.8', owner: '周立倫', status: 'off', agent: 'sinopac-coach-1.0 · wf_insurance' },
};

/** 對練場次：跨場景的假資料，依角色範圍過濾。 */
export const SESSIONS = [
  { id: '7394c5d7ccd217fe', sc: 'wealth',               pe: '退休教師 · 王女士',   diff: 'medium', member: 'SP-0111', date: '2026/09/26', dur: '9′12″', score: 86, status: 'done' },
  { id: '6c138c62b5551255', sc: 'collection',           pe: '拖延客戶 · 張女士',   diff: 'medium', member: 'SP-0112', date: '2026/09/25', dur: '7′02″', score: 90, status: 'done' },
  { id: '0860ea00d8416140', sc: 'antifraud',            pe: '受騙客戶 · 孫阿姨',   diff: 'hard',   member: 'SP-0111', date: '2026/09/24', dur: '6′40″', score: 79, status: 'done' },
  { id: 'b2d18bdd9b8607e4', sc: 'complaint',            pe: '憤怒客戶 · 黃先生',   diff: 'hard',   member: 'SP-0121', date: '2026/09/23', dur: '8′55″', score: 82, status: 'done' },
  { id: '1d35c55b78926adf', sc: 'onboard',              pe: '年長客戶 · 何爺爺',   diff: 'medium', member: 'SP-0113', date: '2026/09/22', dur: '8′30″', score: 93, status: 'done' },
  { id: 'e9363596c0d33fbe', sc: 'insurance',            pe: '排斥客戶 · 譚先生',   diff: 'hard',   member: 'SP-0131', date: '2026/09/19', dur: '10′05″', score: 85, status: 'done' },
  { id: '9f7bf461ff705f30', sc: 'loan-sales-sim',       pe: '本息攤 · 李大雄先生', diff: 'hard',   member: 'SP-0111', date: '2026/09/18', dur: '9′40″', score: 84, status: 'done' },
  { id: 'fba94288abb6e0f3', sc: 'customer-service-sim', pe: '臨調 · 陳大明先生',   diff: 'hard',   member: 'SP-0122', date: '2026/09/17', dur: '7′25″', score: 81, status: 'done' },
  { id: '8dec4bbc04eee073', sc: 'wealth',               pe: '科技新貴 · 陳先生',   diff: 'hard',   member: 'SP-0131', date: '2026/09/16', dur: '11′08″', score: 88, status: 'done' },
  { id: '362a5245750b94c5', sc: 'collection',           pe: '失業客戶 · 李先生',   diff: 'hard',   member: 'SP-0121', date: '2026/09/15', dur: '6′18″', score: 76, status: 'done' },
  { id: 'db9f6b9a163e7e59', sc: 'antifraud',            pe: '猶豫客戶 · 鄭女士',   diff: 'easy',   member: 'SP-0113', date: '2026/09/12', dur: '5′02″', score: 91, status: 'done' },
  { id: 'd0243720f336eef4', sc: 'wealth',               pe: '私行客戶 · 周總',     diff: 'hard',   member: 'SP-0112', date: '2026/09/10', dur: '12′20″', score: 83, status: 'done' },
  { id: '1b71527bbe6b786d', sc: 'complaint',            pe: '委屈客戶 · 劉女士',   diff: 'medium', member: 'SP-0122', date: '2026/09/08', dur: '7′44″', score: 78, status: 'done' },
  { id: '3e5dd4fd001a27b3', sc: 'loan-sales-sim',       pe: '本息攤 · 林小芬小姐', diff: 'medium', member: 'SP-0111', date: '2026/09/05', dur: '8′16″', score: 87, status: 'done' },
  { id: '4e6dfd73a8f9efd1', sc: 'onboard',              pe: '忙碌客戶 · 馮女士',   diff: 'medium', member: 'SP-0131', date: '2026/09/03', dur: '6′55″', score: 89, status: 'done' },
  { id: '2875da5395af4bbf', sc: 'insurance',            pe: '新手父母 · 許女士',   diff: 'medium', member: 'SP-0112', date: '2026/09/01', dur: '9′30″', score: 80, status: 'evaluating' },
  { id: '36171394e09292ea', sc: 'customer-service-sim', pe: '臨調 · 林小芬小姐',   diff: 'medium', member: 'SP-0121', date: '2026/08/29', dur: '6′02″', score: null, status: 'no_score' },
];
