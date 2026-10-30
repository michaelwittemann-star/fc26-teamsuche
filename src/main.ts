// FC 26 Teamsuche – findet Mannschaften, deren Kader bestimmte Spielerprofile enthält

import './style.css';
import { ATTRS, POSITIONS, POS_GROUPS, SLOT_XY, STAT_KEYS, posDe } from './attrs';

interface Player {
  n: string;
  p: string[];
  o: number;
  ag: number;
  h: number;
  sm: number;
  wf: number;
  f: string;
  nat: string | null;
  s: (number | null)[] | null;
}

interface Team {
  id: number;
  n: string;
  lg: string;
  k: 'c' | 'n' | 'w';
  o: number;
  at: number;
  mi: number;
  de: number;
  st: number;
  xi: [number, string][];
  sq: [number, number | null, 0 | 1][];
}

interface Data {
  version: string;
  teams: Team[];
  players: Record<string, Player>;
}

type Op = '>' | '>=' | '<' | '<=';

interface Cond {
  a: string;
  op: Op;
  v: number | null;
}

interface Profile {
  n: number;
  pos: string[];
  main: boolean; // nur Hauptposition zählt
  conds: Cond[];
}

interface State {
  profiles: Profile[];
  kinds: string[];
  stars: [number, number];
  q: string;
  xiOnly: boolean;
  sort: string;
  desc: boolean;
}

interface Hit {
  team: Team;
  assign: number[][]; // je Profil die zugeordneten Spieler-IDs
}

const KIND_LABEL: Record<string, string> = { c: 'Vereine', n: 'Nationalteams', w: 'Frauen' };
const OPS: Op[] = ['>=', '>', '<=', '<'];
const OP_LABEL: Record<Op, string> = { '>=': '≥', '>': '>', '<=': '≤', '<': '<' };
const PROFILE_COLORS = ['#3ddc84', '#4cc3ff', '#ffb547', '#ff6b9a', '#b18cff', '#f5e663'];
const STAT_IDX = Object.fromEntries(STAT_KEYS.map((k, i) => [k, i]));
const PAGE = 200;

const EXAMPLE: Profile[] = [
  { n: 2, pos: ['ST', 'CF'], main: false, conds: [{ a: 'pac', op: '>', v: 90 }] },
  { n: 3, pos: ['LW', 'RW', 'LM', 'RM'], main: false, conds: [{ a: 'dri', op: '>', v: 80 }] },
  { n: 1, pos: ['CB'], main: false, conds: [{ a: 'h', op: '>=', v: 198 }] },
];

const newProfile = (): Profile => ({ n: 1, pos: [], main: false, conds: [{ a: 'pac', op: '>=', v: null }] });

function defaultState(): State {
  return { profiles: [newProfile()], kinds: ['c', 'n'], stars: [0.5, 5], q: '', xiOnly: false, sort: 'st', desc: true };
}

let data: Data;
let state: State = loadState();
let hits: Hit[] = [];
let shown = PAGE;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// ---------- Zustand in der URL (teilbare Suchen) ----------

function loadState(): State {
  try {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) return { ...defaultState(), ...JSON.parse(h) };
  } catch {
    /* kaputter Link -> Standard */
  }
  return defaultState();
}

function saveState() {
  history.replaceState(null, '', '#' + encodeURIComponent(JSON.stringify(state)));
}

// ---------- Suche ----------

function value(p: Player, key: string): number | null {
  switch (key) {
    case 'ovr': return p.o;
    case 'h': return p.h;
    case 'ag': return p.ag;
    case 'sm': return p.sm;
    case 'wf': return p.wf;
  }
  return p.s ? p.s[STAT_IDX[key]] : null;
}

function test(x: number, op: Op, v: number): boolean {
  return op === '>' ? x > v : op === '>=' ? x >= v : op === '<' ? x < v : x <= v;
}

function fits(p: Player, pr: Profile): boolean {
  if (pr.pos.length) {
    const pos = pr.main ? p.p.slice(0, 1) : p.p;
    if (!pos.some((c) => pr.pos.includes(c))) return false;
  }
  for (const c of pr.conds) {
    if (c.v === null || Number.isNaN(c.v)) continue;
    const x = value(p, c.a);
    if (x === null || !test(x, c.op, c.v)) return false;
  }
  return true;
}

const activeProfiles = () => state.profiles.filter((pr) => pr.n > 0);

// Jeder Spieler darf nur ein Profil erfüllen: bipartites Matching Profil-Plätze <-> Spieler
function matchTeam(team: Team, profiles: Profile[]): number[][] | null {
  const ids = state.xiOnly ? team.xi.map((x) => x[0]) : team.sq.map((x) => x[0]);
  const cands = profiles.map((pr) => ids.filter((id) => fits(data.players[id], pr)));
  if (cands.some((c, i) => c.length < profiles[i].n)) return null;
  const slots: number[] = [];
  profiles.forEach((pr, i) => { for (let k = 0; k < pr.n; k++) slots.push(i); });
  const owner = new Map<number, number>(); // Spieler -> Slot
  const tryAssign = (slot: number, seen: Set<number>): boolean => {
    for (const id of cands[slots[slot]]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const o = owner.get(id);
      if (o === undefined || tryAssign(o, seen)) {
        owner.set(id, slot);
        return true;
      }
    }
    return false;
  };
  for (let s = 0; s < slots.length; s++) if (!tryAssign(s, new Set())) return null;
  const assign: number[][] = profiles.map(() => []);
  for (const [id, slot] of owner) assign[slots[slot]].push(id);
  return assign;
}

function search() {
  const profiles = activeProfiles();
  const q = state.q.trim().toLowerCase();
  hits = [];
  for (const t of data.teams) {
    if (!state.kinds.includes(t.k)) continue;
    if (t.st < state.stars[0] || t.st > state.stars[1]) continue;
    if (q && !t.n.toLowerCase().includes(q) && !t.lg.toLowerCase().includes(q)) continue;
    const assign = matchTeam(t, profiles);
    if (assign) hits.push({ team: t, assign });
  }
  sortHits();
  shown = PAGE;
}

const SORTERS: Record<string, (h: Hit) => number | string> = {
  n: (h) => h.team.n,
  lg: (h) => h.team.lg,
  st: (h) => h.team.st * 1000 + h.team.o,
  o: (h) => h.team.o,
  at: (h) => h.team.at,
  mi: (h) => h.team.mi,
  de: (h) => h.team.de,
};

function sortHits() {
  const f = SORTERS[state.sort] ?? SORTERS.st;
  const dir = state.desc ? -1 : 1;
  hits.sort((a, b) => {
    const x = f(a), y = f(b);
    const c = typeof x === 'string' ? x.localeCompare(y as string, 'de') : (x as number) - (y as number);
    return c * dir || a.team.n.localeCompare(b.team.n, 'de');
  });
}

// ---------- Darstellung: Profile ----------

function attrOptions(sel: string): string {
  const groups = [...new Set(ATTRS.map((a) => a.group))];
  return groups
    .map((g) => `<optgroup label="${g}">${ATTRS.filter((a) => a.group === g)
      .map((a) => `<option value="${a.key}"${a.key === sel ? ' selected' : ''}>${a.label}</option>`).join('')}</optgroup>`)
    .join('');
}

function renderProfiles() {
  const box = $('#profiles');
  box.innerHTML = state.profiles.map((pr, i) => `
    <section class="profile" data-i="${i}" style="--pc:${PROFILE_COLORS[i % PROFILE_COLORS.length]}">
      <div class="profile-head">
        <span class="profile-tag">Profil ${i + 1}</span>
        <label class="count">Mindestens
          <input type="number" min="1" max="11" value="${pr.n}" data-f="n" /> Spieler
        </label>
        ${state.profiles.length > 1 ? `<button class="icon-btn del" data-act="del" title="Profil entfernen" aria-label="Profil entfernen">✕</button>` : ''}
      </div>
      <div class="field-label">Kann spielen auf <span class="hint">${pr.pos.length ? '' : '(alle Positionen)'}</span></div>
      <div class="groups">${POS_GROUPS.map((g) => {
        const on = g.codes.every((c) => pr.pos.includes(c));
        return `<button class="chip group${on ? ' on' : ''}" data-act="group" data-codes="${g.codes.join(',')}">${g.label}</button>`;
      }).join('')}</div>
      <div class="chips">${POSITIONS.map((p) =>
        `<button class="chip${pr.pos.includes(p.code) ? ' on' : ''}" data-act="pos" data-code="${p.code}" title="${p.name}">${p.de}</button>`).join('')}
      </div>
      <label class="check"><input type="checkbox" data-f="main"${pr.main ? ' checked' : ''}/> nur Hauptposition zählt</label>
      <div class="field-label">Werte</div>
      <div class="conds">${pr.conds.map((c, j) => `
        <div class="cond" data-j="${j}">
          <select data-f="a">${attrOptions(c.a)}</select>
          <select data-f="op" class="op">${OPS.map((o) => `<option value="${o}"${o === c.op ? ' selected' : ''}>${OP_LABEL[o]}</option>`).join('')}</select>
          <input type="number" data-f="v" value="${c.v ?? ''}" placeholder="${c.a === 'h' ? 'cm' : 'Wert'}" />
          <button class="icon-btn" data-act="delcond" title="Bedingung entfernen" aria-label="Bedingung entfernen">✕</button>
        </div>`).join('')}
      </div>
      <button class="link-btn" data-act="addcond">+ Bedingung</button>
    </section>`).join('');
}

function onProfileInput(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const sec = el.closest<HTMLElement>('.profile');
  if (!sec || !el.dataset.f) return;
  const pr = state.profiles[+sec.dataset.i!];
  const row = el.closest<HTMLElement>('.cond');
  if (row) {
    const c = pr.conds[+row.dataset.j!];
    if (el.dataset.f === 'a') {
      c.a = el.value;
      (row.querySelector('[data-f=v]') as HTMLInputElement).placeholder = c.a === 'h' ? 'cm' : 'Wert';
    }
    if (el.dataset.f === 'op') c.op = el.value as Op;
    if (el.dataset.f === 'v') c.v = el.value === '' ? null : +el.value;
  } else if (el.dataset.f === 'n') {
    pr.n = Math.max(0, Math.min(11, Math.floor(+el.value || 0)));
  } else if (el.dataset.f === 'main') {
    pr.main = (el as HTMLInputElement).checked;
  }
  update(false);
}

function onProfileClick(e: Event) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'add') {
    state.profiles.push(newProfile());
  } else if (act === 'example') {
    state.profiles = structuredClone(EXAMPLE);
  } else if (act === 'reset') {
    state = defaultState();
    renderTeamFilters();
  } else {
    const sec = btn.closest<HTMLElement>('.profile');
    if (!sec) return;
    const i = +sec.dataset.i!;
    const pr = state.profiles[i];
    if (act === 'del') state.profiles.splice(i, 1);
    if (act === 'addcond') pr.conds.push({ a: 'ovr', op: '>=', v: null });
    if (act === 'delcond') pr.conds.splice(+btn.closest<HTMLElement>('.cond')!.dataset.j!, 1);
    if (act === 'pos') {
      const c = btn.dataset.code!;
      pr.pos = pr.pos.includes(c) ? pr.pos.filter((x) => x !== c) : [...pr.pos, c];
    }
    if (act === 'group') {
      const codes = btn.dataset.codes!.split(',');
      const all = codes.every((c) => pr.pos.includes(c));
      pr.pos = all ? pr.pos.filter((c) => !codes.includes(c)) : [...new Set([...pr.pos, ...codes])];
    }
  }
  update(true);
}

// ---------- Darstellung: Teamfilter ----------

function starOptions(sel: number): string {
  const out = [];
  for (let s = 0.5; s <= 5; s += 0.5) out.push(`<option value="${s}"${s === sel ? ' selected' : ''}>${s.toLocaleString('de')} ★</option>`);
  return out.join('');
}

function renderTeamFilters() {
  $('#teamFilters').innerHTML = `
    <div class="tf-row">
      ${Object.entries(KIND_LABEL).map(([k, l]) =>
        `<label class="check"><input type="checkbox" data-kind="${k}"${state.kinds.includes(k) ? ' checked' : ''}/> ${l}</label>`).join('')}
    </div>
    <div class="tf-row">
      <span class="field-label inline">Sterne
        <span class="info" tabindex="0">?<span class="info-pop">
          Die Sterne sind <b>geschätzt</b>: FIFACM nennt nur die Team-Gesamtwertung. Die Umrechnung wurde an den
          bekannten Sternen zum Release geprüft (5★ ab 83, 4,5★ ab 79, 4★ ab 75, darunter je 4 Punkte eine halbe Stufe).
          An den Grenzen kann das Spiel einen halben Stern abweichen.
        </span></span>
      </span>
      <select id="starMin">${starOptions(state.stars[0])}</select>
      <span class="muted">bis</span>
      <select id="starMax">${starOptions(state.stars[1])}</select>
    </div>
    <div class="tf-row">
      <input id="q" type="search" placeholder="Team oder Liga …" value="${esc(state.q)}" />
    </div>
    <div class="tf-row">
      <label class="check"><input type="checkbox" id="xiOnly"${state.xiOnly ? ' checked' : ''}/> nur Spieler der Startelf zählen</label>
    </div>`;
}

function onTeamFilter(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el.dataset.kind) {
    const k = el.dataset.kind;
    state.kinds = el.checked ? [...state.kinds, k] : state.kinds.filter((x) => x !== k);
  } else if (el.id === 'starMin') state.stars[0] = +el.value;
  else if (el.id === 'starMax') state.stars[1] = +el.value;
  else if (el.id === 'q') state.q = el.value;
  else if (el.id === 'xiOnly') state.xiOnly = el.checked;
  update(false);
}

// ---------- Darstellung: Ergebnisse ----------

function starsHtml(s: number): string {
  let out = '';
  for (let i = 1; i <= 5; i++) out += `<span class="star ${s >= i ? 'full' : s >= i - 0.5 ? 'half' : ''}">★</span>`;
  return `<span class="stars" title="${s.toLocaleString('de')} Sterne (geschätzt)">${out}</span>`;
}

function shortName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 && name.length > 14 ? parts.slice(1).join(' ') : name;
}

function hitSummary(h: Hit, profiles: Profile[]): string {
  return h.assign.map((ids, i) => {
    const pr = profiles[i];
    const keys = pr.conds.filter((c) => c.v !== null).map((c) => c.a);
    return ids.map((id) => {
      const p = data.players[id];
      const vals = keys.map((k) => value(p, k)).filter((x) => x !== null).join('/');
      return `<span class="hit" style="--pc:${PROFILE_COLORS[state.profiles.indexOf(pr) % PROFILE_COLORS.length]}" title="${esc(p.n)} · ${p.p.map(posDe).join(', ')}">${esc(shortName(p.n))}${vals ? ` <b>${vals}</b>` : ''}</span>`;
    }).join('');
  }).join('');
}

const COLS: [string, string][] = [['n', 'Team'], ['lg', 'Liga'], ['st', 'Sterne'], ['o', 'GES'], ['at', 'ANG'], ['mi', 'MIT'], ['de', 'ABW']];

function renderResults() {
  const profiles = activeProfiles();
  const filtered = profiles.some((p) => p.pos.length || p.conds.some((c) => c.v !== null));
  $('#count').textContent = `${hits.length.toLocaleString('de')} ${hits.length === 1 ? 'Team' : 'Teams'}${filtered ? (hits.length === 1 ? ' passt' : ' passen') : ''}`;
  const head = COLS.map(([k, l]) =>
    `<th data-sort="${k}" class="${k === state.sort ? (state.desc ? 'desc' : 'asc') : ''}${['o', 'at', 'mi', 'de'].includes(k) ? ' num' : ''}">${l}</th>`).join('');
  const rows = hits.slice(0, shown).map((h) => {
    const t = h.team;
    return `<tr>
      <td><button class="team-link" data-team="${t.id}">${esc(t.n)}</button>${t.k !== 'c' ? ` <span class="kind">${t.k === 'w' ? 'Frauen' : 'Nation'}</span>` : ''}</td>
      <td class="muted">${esc(t.lg)}</td>
      <td>${starsHtml(t.st)}</td>
      <td class="num strong">${t.o}</td><td class="num">${t.at}</td><td class="num">${t.mi}</td><td class="num">${t.de}</td>
      <td class="hits">${filtered ? hitSummary(h, profiles) : ''}</td>
    </tr>`;
  }).join('');
  $('#results').innerHTML = hits.length
    ? `<table class="res"><thead><tr>${head}<th>Passende Spieler</th></tr></thead><tbody>${rows}</tbody></table>
       ${hits.length > shown ? `<button class="more" id="more">Weitere ${Math.min(PAGE, hits.length - shown)} anzeigen</button>` : ''}`
    : `<p class="empty">Kein Team erfüllt alle Profile. Lockere eine Bedingung oder senke die Anzahl.</p>`;
}

function onResultsClick(e: Event) {
  const el = e.target as HTMLElement;
  const th = el.closest<HTMLElement>('th[data-sort]');
  if (th) {
    const k = th.dataset.sort!;
    state.desc = state.sort === k ? !state.desc : !['n', 'lg'].includes(k);
    state.sort = k;
    sortHits();
    saveState();
    renderResults();
    return;
  }
  const tb = el.closest<HTMLElement>('[data-team]');
  if (tb) openTeam(+tb.dataset.team!);
  if (el.id === 'more') {
    shown += PAGE;
    renderResults();
  }
}

// ---------- Team-Ansicht ----------

// Formationsname nach FC-Rollen: Abwehr – def. Mittelfeld – Mittelfeld – off. Mittelfeld – Sturm
const ROLE: Record<string, string> = {
  LB: 'D', RB: 'D', CB: 'D', LCB: 'D', RCB: 'D', SW: 'D', LWB: 'D', RWB: 'D',
  CDM: 'DM', LDM: 'DM', RDM: 'DM',
  CM: 'M', LCM: 'M', RCM: 'M', LM: 'W', RM: 'W',
  CAM: 'AM', LAM: 'AM', RAM: 'AM',
  LW: 'F', RW: 'F', ST: 'F', LS: 'F', RS: 'F', CF: 'F', LF: 'F', RF: 'F',
};

function formation(xi: [number, string][]): string {
  const n: Record<string, number> = { D: 0, DM: 0, M: 0, W: 0, AM: 0, F: 0 };
  for (const [, slot] of xi) if (ROLE[slot]) n[ROLE[slot]]++;
  // Außenspieler gehören bei einer Spitze ohne Zentrale zur offensiven Reihe (4-2-3-1), sonst ins Mittelfeld
  if (n.AM && n.F === 1 && !n.M) n.AM += n.W;
  else n.M += n.W;
  // Ein Zehner hinter drei Stürmern zählt zum Mittelfeld (4-3-3 offensiv)
  if (n.F >= 3 && n.AM === 1) {
    n.M += n.AM;
    n.AM = 0;
  }
  // Ein einzelner Sechser bildet nur bei vollem Mittelfeld oder Zehner eine eigene Reihe
  if (!n.AM && n.M <= 2) {
    n.M += n.DM;
    n.DM = 0;
  }
  return [n.D, n.DM, n.M, n.AM, n.F].filter(Boolean).join('-');
}

function profileMarks(id: number): string {
  const p = data.players[id];
  return state.profiles.map((pr, i) => (pr.n > 0 && (pr.pos.length || pr.conds.some((c) => c.v !== null)) && fits(p, pr)
    ? `<span class="pmark" style="--pc:${PROFILE_COLORS[i % PROFILE_COLORS.length]}" title="erfüllt Profil ${i + 1}">${i + 1}</span>` : '')).join('');
}

function pitchHtml(t: Team): string {
  const used = new Map<string, number>();
  return t.xi.map(([id, slot]) => {
    const p = data.players[id];
    let [x, y] = SLOT_XY[slot] ?? [50, 50];
    const n = used.get(slot) ?? 0;
    used.set(slot, n + 1);
    x += n * 12;
    return `<div class="pp" style="left:${x}%;top:${y}%">
      <div class="pp-ovr">${p?.o ?? ''}</div>
      <div class="pp-name">${esc(p ? shortName(p.n) : '?')}</div>
      <div class="pp-pos">${posDe(slot)}</div>${profileMarks(id)}
    </div>`;
  }).join('');
}

function attrsDetail(p: Player): string {
  if (!p.s) return '<p class="muted">Keine Einzelwerte vorhanden.</p>';
  const groups = [...new Set(ATTRS.filter((a) => a.key in STAT_IDX).map((a) => a.group))];
  return `<div class="attr-grid">${groups.map((g) => `<div><h4>${g}</h4>${ATTRS.filter((a) => a.group === g && a.key in STAT_IDX)
    .map((a) => { const v = p.s![STAT_IDX[a.key]]; return `<div class="attr"><span>${a.label}</span><b class="${cls(v)}">${v ?? '–'}</b></div>`; }).join('')}</div>`).join('')}</div>`;
}

function cls(v: number | null): string {
  if (v === null) return '';
  return v >= 85 ? 'v-top' : v >= 75 ? 'v-good' : v >= 65 ? 'v-mid' : 'v-low';
}

const POS_ORDER = Object.fromEntries(['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'].map((c, i) => [c, i]));

function openTeam(id: number) {
  const t = data.teams.find((x) => x.id === id)!;
  const inXi = new Set(t.xi.map((x) => x[0]));
  const squad = [...t.sq].sort((a, b) => {
    const pa = data.players[a[0]], pb = data.players[b[0]];
    return (POS_ORDER[pa.p[0]] ?? 99) - (POS_ORDER[pb.p[0]] ?? 99) || pb.o - pa.o;
  });
  const rows = squad.map(([pid, no, loan]) => {
    const p = data.players[pid];
    const face = (p.s ?? []).slice(0, 6);
    return `<tr class="prow${inXi.has(pid) ? ' xi' : ''}" data-pid="${pid}">
      <td class="muted num">${no ?? ''}</td>
      <td><span class="pname">${esc(p.n)}</span>${loan && t.k === 'c' ? ' <span class="kind">Leihe</span>' : ''}${profileMarks(pid)}</td>
      <td class="pos">${p.p.map(posDe).join(', ')}</td>
      <td class="num strong">${p.o}</td><td class="num">${p.ag}</td><td class="num">${p.h}</td>
      <td class="num">${p.f === 'L' ? 'L' : p.f === 'R' ? 'R' : ''}</td>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<td class="num ${cls(face[i] ?? null)}">${face[i] ?? '–'}</td>`).join('')}
    </tr>`;
  }).join('');
  $('#teamDialog').innerHTML = `
    <div class="dlg">
      <header class="dlg-head">
        <div>
          <h2>${esc(t.n)}</h2>
          <div class="muted">${esc(t.lg)} · ${starsHtml(t.st)} · GES <b>${t.o}</b> · ANG ${t.at} · MIT ${t.mi} · ABW ${t.de}</div>
        </div>
        <button class="icon-btn" data-close aria-label="Schließen">✕</button>
      </header>
      <div class="dlg-body">
        <div class="pitch-wrap">
          <div class="field-label">Standardaufstellung${t.xi.length ? ' · ' + formation(t.xi) : ' fehlt in den Daten'}</div>
          <div class="pitch">
            <div class="pl pl-half"></div><div class="pl pl-circle"></div>
            <div class="pl pl-box top"></div><div class="pl pl-box bottom"></div>
            ${pitchHtml(t)}
          </div>
        </div>
        <div class="squad-wrap">
          <div class="field-label">Kader (${t.sq.length}) · Klick auf einen Spieler zeigt alle Werte</div>
          <table class="squad">
            <thead><tr><th>#</th><th>Name</th><th>Pos.</th><th class="num">GES</th><th class="num">Alt</th><th class="num">cm</th><th class="num">Fuß</th>
            <th class="num">TEM</th><th class="num">SCH</th><th class="num">PAS</th><th class="num">DRI</th><th class="num">VER</th><th class="num">PHY</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  ($('#teamDialog') as HTMLDialogElement).showModal();
}

function onDialogClick(e: Event) {
  const dlg = $('#teamDialog') as HTMLDialogElement;
  const el = e.target as HTMLElement;
  if (el === dlg || el.closest('[data-close]')) {
    dlg.close();
    return;
  }
  const row = el.closest<HTMLElement>('tr.prow');
  if (!row) return;
  const next = row.nextElementSibling;
  if (next?.classList.contains('pdetail')) {
    next.remove();
    row.classList.remove('open');
    return;
  }
  row.classList.add('open');
  row.insertAdjacentHTML('afterend', `<tr class="pdetail"><td colspan="13">${attrsDetail(data.players[row.dataset.pid!])}</td></tr>`);
}

// ---------- Ablauf ----------

let timer = 0;
function update(rerenderProfiles: boolean) {
  if (rerenderProfiles) renderProfiles();
  saveState();
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    search();
    renderResults();
  }, 120);
}

async function init() {
  const res = await fetch('./data/fc26.json');
  data = await res.json();
  $('#version').textContent = data.version;
  renderProfiles();
  renderTeamFilters();
  search();
  renderResults();
  const pbox = $('#profileArea');
  pbox.addEventListener('input', onProfileInput);
  pbox.addEventListener('change', onProfileInput);
  pbox.addEventListener('click', onProfileClick);
  $('#teamFilters').addEventListener('input', onTeamFilter);
  $('#results').addEventListener('click', onResultsClick);
  $('#teamDialog').addEventListener('click', onDialogClick);
}

init().catch((e) => {
  $('#results').innerHTML = `<p class="empty">Daten konnten nicht geladen werden: ${esc(String(e))}</p>`;
});
