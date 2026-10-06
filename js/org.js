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
  'credit-revisit': { ver: 'v1.0', owner: '周立倫', status: 'on', agent: 'altabots · 信貸電銷對練 Agent（iframe）· 複訪' },
  'credit-bargain': { ver: 'v1.0', owner: '周立倫', status: 'on', agent: 'altabots · 信貸電銷對練 Agent（iframe）· 議價' },
  'cs-bank':        { ver: 'v1.0', owner: '李文君', status: 'on', agent: 'altabots · 客服話務 Agent（iframe）· 銀行話務' },
  'cs-card':        { ver: 'v1.0', owner: '李文君', status: 'on', agent: 'altabots · 客服話務 Agent（iframe）· 信用卡話務' },
};

/** 對練場次：跨場景的假資料，依角色範圍過濾。 */
export const SESSIONS = [
  { id: '7394c5d7ccd217fe', sc: 'credit-revisit', pe: '複訪 A1 · 上班族拖延 李先生', diff: 'L2',        member: 'SP-0111', date: '2026/09/26', dur: '6′12″', score: 86, status: 'done' },
  { id: '6c138c62b5551255', sc: 'cs-card',        pe: '臨調額度 · 陳大明先生',     diff: 'complaint', member: 'SP-0112', date: '2026/09/25', dur: '5′20″', score: 85, status: 'done' },
  { id: '0860ea00d8416140', sc: 'credit-bargain', pe: '議價 B2 · 情緒施壓 王先生',  diff: 'L3',        member: 'SP-0111', date: '2026/09/24', dur: '7′40″', score: 79, status: 'done' },
  { id: 'b2d18bdd9b8607e4', sc: 'cs-bank',        pe: '咆哮取消電銷 · 黃先生',     diff: 'complaint', member: 'SP-0121', date: '2026/09/23', dur: '5′55″', score: 82, status: 'done' },
  { id: '1d35c55b78926adf', sc: 'cs-bank',        pe: '高齡客戶 · 何爺爺',         diff: 'normal',    member: 'SP-0113', date: '2026/09/22', dur: '6′12″', score: 93, status: 'done' },
  { id: 'e9363596c0d33fbe', sc: 'credit-revisit', pe: '複訪 A2 · 台語疑似詐騙 陳先生', diff: 'L3',    member: 'SP-0131', date: '2026/09/19', dur: '8′05″', score: 85, status: 'done' },
  { id: '9f7bf461ff705f30', sc: 'credit-bargain', pe: '議價 B1 · 精算比價 林小姐',  diff: 'L2',        member: 'SP-0111', date: '2026/09/18', dur: '7′10″', score: 84, status: 'done' },
  { id: 'fba94288abb6e0f3', sc: 'cs-card',        pe: '帳單疑問 · 林小芬小姐',     diff: 'normal',    member: 'SP-0122', date: '2026/09/17', dur: '4′25″', score: 81, status: 'done' },
  { id: '8dec4bbc04eee073', sc: 'credit-revisit', pe: '複訪 A1 · 上班族拖延 李先生', diff: 'L1',        member: 'SP-0131', date: '2026/09/16', dur: '5′08″', score: 88, status: 'done' },
  { id: '362a5245750b94c5', sc: 'credit-bargain', pe: '議價 B2 · 情緒施壓 王先生',  diff: 'L3',        member: 'SP-0121', date: '2026/09/15', dur: '6′18″', score: 76, status: 'done' },
  { id: 'db9f6b9a163e7e59', sc: 'cs-bank',        pe: '高齡客戶 · 何爺爺',         diff: 'normal',    member: 'SP-0113', date: '2026/09/12', dur: '5′02″', score: 91, status: 'done' },
  { id: 'd0243720f336eef4', sc: 'credit-revisit', pe: '複訪 A2 · 台語疑似詐騙 陳先生', diff: 'L3',    member: 'SP-0112', date: '2026/09/10', dur: '7′20″', score: 83, status: 'done' },
  { id: '1b71527bbe6b786d', sc: 'cs-card',        pe: '臨調額度 · 陳大明先生',     diff: 'complaint', member: 'SP-0122', date: '2026/09/08', dur: '5′44″', score: 78, status: 'done' },
  { id: '3e5dd4fd001a27b3', sc: 'credit-bargain', pe: '議價 B1 · 精算比價 林小姐',  diff: 'L1',        member: 'SP-0111', date: '2026/09/05', dur: '5′16″', score: 87, status: 'done' },
  { id: '4e6dfd73a8f9efd1', sc: 'cs-bank',        pe: '咆哮取消電銷 · 黃先生',     diff: 'complaint', member: 'SP-0131', date: '2026/09/03', dur: '6′55″', score: 89, status: 'done' },
  { id: '2875da5395af4bbf', sc: 'credit-revisit', pe: '複訪 A1 · 上班族拖延 李先生', diff: 'L2',        member: 'SP-0112', date: '2026/09/01', dur: '6′30″', score: 80, status: 'evaluating' },
  { id: '36171394e09292ea', sc: 'cs-card',        pe: '帳單疑問 · 林小芬小姐',     diff: 'normal',    member: 'SP-0121', date: '2026/08/29', dur: '4′02″', score: null, status: 'no_score' },
];
