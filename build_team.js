const fs = require('fs');
const d = require('./output/result.json');

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_CITY = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };
const TEAM_NICKNAME = { LA: 'Queens', NY: 'Heights', SF: 'Firebells', BOS: 'Hunters' };

const scrapedDate = new Date(d.scrapedAt);
const dateStr = scrapedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function fmt3(v) { return v == null ? '—' : v.toFixed(3).replace(/^0\./,'.').replace(/^-0\./,'-.'); }

const teamsJson = JSON.stringify(d.teams);
const playersJson = JSON.stringify(d.explorerPlayers);
const pcaPlayersJson = JSON.stringify(d.pcaPlayers.map(p => ({ name: p.name, team: p.team, pc1: p.pc1, pc2: p.pc2 })));
const pcaExplainedJson = JSON.stringify(d.pca_explained);
const teamColorJson = JSON.stringify(TEAM_COLOR);
const teamCityJson = JSON.stringify(TEAM_CITY);
const teamNicknameJson = JSON.stringify(TEAM_NICKNAME);
const teamCodesJson = JSON.stringify(d.teamCodes);

const tabButtons = d.teamCodes.map((code, i) =>
  `<button class="team-tab${i===0?' active':''}" data-team="${code}" style="--tab-color:${TEAM_COLOR[code]}">${TEAM_CITY[code]} <b>${TEAM_NICKNAME[code]}</b></button>`
).join('\n      ');

const html = `<title>WPBL 2026 Team Pages</title>
<style>
.viz-root {
  color-scheme: light;
  --surface-0: #f5f4f0; --surface-1: #ffffff; --surface-2: #f0efe9;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --good: #0ca30c; --bad: #d03b3b;
  --la: ${TEAM_COLOR.LA}; --ny: ${TEAM_COLOR.NY}; --sf: ${TEAM_COLOR.SF}; --bos: ${TEAM_COLOR.BOS};
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text-primary); background: var(--surface-0);
  padding: 28px 20px 56px; box-sizing: border-box;
}
.viz-root * { box-sizing: border-box; }
.wrap { max-width: 1120px; margin: 0 auto; }
header.page-head { margin-bottom: 18px; }
header.page-head .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
header.page-head h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
header.page-head p { margin: 0; color: var(--text-secondary); font-size: 13.5px; }
header.page-head .cite { color: var(--text-muted); font-size: 11.5px; margin-top: 8px; }
.team-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 18px 0; }
.team-tab { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 9px 16px; cursor: pointer; }
.team-tab b { font-weight: 800; }
.team-tab.active { background: var(--tab-color); color: #fff; border-color: var(--tab-color); }
.toggle-row { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; cursor: pointer; width: fit-content; }
.team-header { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 18px; }
.team-header .bar { height: 6px; }
.team-header .head { padding: 18px 22px 14px; background: var(--surface-1); }
.team-header .nickname { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
.team-header .rec { font-size: 32px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.team-header .place { font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.team-header .stats { display: grid; grid-template-columns: repeat(8, 1fr); border-top: 1px solid var(--grid); background: var(--surface-1); }
.team-header .stat-cell { padding: 12px 8px; text-align: center; border-right: 1px solid var(--grid); border-top: 1px solid var(--grid); }
.team-header .stat-cell:nth-child(8n) { border-right: none; }
.team-header .stat-cell .v { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.team-header .stat-cell .k { font-size: 9.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.team-header .stat-cell.diff-pos .v { color: var(--good); }
.team-header .stat-cell.diff-neg .v { color: var(--bad); }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 28px 0 12px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--grid); }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; overflow-x: auto; }
.card .sub { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }
table.stat-table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
table.stat-table th { text-align: right; font-weight: 600; color: var(--text-muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.02em; padding: 6px 8px; border-bottom: 1px solid var(--baseline); cursor: pointer; user-select: none; }
table.stat-table th:hover { color: var(--text-primary); }
table.stat-table th:first-child, table.stat-table td:first-child { text-align: left; }
table.stat-table th.sorted { color: var(--text-primary); }
table.stat-table th .arrow { font-size: 9px; margin-left: 2px; opacity: 0.6; }
table.stat-table td { padding: 7px 8px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; text-align: right; color: var(--text-primary); }
table.stat-table td.name { font-variant-numeric: initial; }
table.stat-table tbody tr:last-child td { border-bottom: none; }
table.stat-table tbody tr.unsigned td { color: var(--text-muted); }
a.player-link { color: inherit; text-decoration: none; }
a.player-link:hover { text-decoration: underline; }
svg text.axis-label { font-size: 9px; fill: var(--text-muted); font-family: system-ui, sans-serif; }
svg text.axis-title { font-size: 10.5px; fill: var(--text-secondary); font-family: system-ui, sans-serif; font-weight: 600; }
svg line.gridline { stroke: var(--grid); stroke-width: 1; }
svg line.axis-line { stroke: var(--baseline); stroke-width: 1; }
svg circle.pt-team { cursor: pointer; }
.pca-tooltip { position: fixed; pointer-events: none; background: var(--text-primary); color: var(--surface-1); font-size: 12px; padding: 6px 9px; border-radius: 6px; opacity: 0; transition: opacity 0.1s; white-space: nowrap; z-index: 1000; }
.disclaimer-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); text-align: center; line-height: 1.6; }
.disclaimer-footer a { color: var(--text-secondary); }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <div class="kicker">2026 Regular Season</div>
      <h1>WPBL Team Pages</h1>
      <p>Full roster, batting, pitching, and at-bat PCA for each team — like the league's own team pages. Click any column header to sort.</p>
      <p class="cite">Source: womensprobaseballleague.com/stats &amp; /prospect-ranking — through ${dateStr} · auto-updated daily</p>
    </header>

    <div class="team-tabs">
      ${tabButtons}
    </div>

    <label class="toggle-row"><input type="checkbox" id="teamUnsignedToggle" checked> Include drafted (not yet signed) players</label>

    <div id="teamHeader"></div>

    <div class="section-title">Batting</div>
    <div class="card"><table class="stat-table" id="battingTable"></table></div>

    <div class="section-title">Pitching</div>
    <div class="card"><table class="stat-table" id="pitchingTable"></table></div>

    <div class="section-title">At-Bat PCA — This Team vs. League</div>
    <div class="card">
      <p class="sub">Same PCA space as the Analytics tab (batting only). This team's batters are highlighted in color; everyone else is faded for context.</p>
      <div id="pcaChart" style="max-width:640px;"></div>
    </div>

    <div class="section-title">Full Roster</div>
    <div class="card"><table class="stat-table" id="rosterTable"></table></div>

    <footer class="disclaimer-footer">Unofficial fan project — not affiliated with, endorsed by, or sponsored by the Women's Pro Baseball League. Stats and player data sourced from <a href="https://www.womensprobaseballleague.com" target="_blank" rel="noopener">womensprobaseballleague.com</a>. Built with <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude</a>.</footer>
  </div>
  <div class="pca-tooltip" id="pcaTooltip"></div>
</div>
<script>
(function(){
const TEAMS = ${teamsJson};
const PLAYERS = ${playersJson};
const PCA_PLAYERS = ${pcaPlayersJson};
const PCA_EXPLAINED = ${pcaExplainedJson};
const TEAM_COLOR = ${teamColorJson};
const TEAM_CITY = ${teamCityJson};
const TEAM_NICKNAME = ${teamNicknameJson};
const TEAM_CODES = ${teamCodesJson};

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  return n + (['th','st','nd','rd'][n % 10] || 'th');
}
function placeLabel(t) {
  const tied = TEAMS.filter(function(x){ return x.place === t.place; }).length > 1;
  return (tied ? 'T-' : '') + ordinal(t.place);
}
function fmt3(v) { return v == null ? '\\u2014' : v.toFixed(3).replace(/^0\\./,'.').replace(/^-0\\./,'-.'); }
function fmtIP(ip) { if (ip == null) return '\\u2014'; const w = Math.floor(ip); const f = Math.round((ip-w)*3); return w + '.' + f; }
function nameLink(p) { return p.url ? '<a class="player-link" href="' + p.url + '" target="_blank" rel="noopener">' + p.name + '</a>' : p.name; }
function fmtDraft(p) { return p.draftRound != null ? 'R' + p.draftRound + ' \\u00b7 #' + p.draftPick : '\\u2014'; }
function escapeAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let currentTeam = TEAM_CODES[0];
const toggle = document.getElementById('teamUnsignedToggle');

// ---- generic sortable table ----
// columns: [{key, label, numeric, fmt}]. sortState is mutated in place per table id.
const sortState = {};
function renderSortableTable(tableId, columns, rows, extraRowClass, defaultKey) {
  if (!sortState[tableId]) sortState[tableId] = { key: defaultKey || columns[0].sortKey || columns[0].key, dir: 'desc' };
  const st = sortState[tableId];
  const sorted = rows.slice().sort(function(a, b) {
    const av = a[st.key], bv = b[st.key];
    const an = av == null, bn = bv == null;
    if (an && bn) return 0;
    if (an) return 1;
    if (bn) return -1;
    if (av < bv) return st.dir === 'asc' ? -1 : 1;
    if (av > bv) return st.dir === 'asc' ? 1 : -1;
    return 0;
  });
  const thead = '<thead><tr>' + columns.map(function(c) {
    const key = c.sortKey || c.key;
    const isSorted = st.key === key;
    const arrow = isSorted ? '<span class="arrow">' + (st.dir === 'asc' ? '\\u25b2' : '\\u25bc') + '</span>' : '';
    return '<th data-key="' + key + '" class="' + (isSorted ? 'sorted' : '') + '">' + c.label + arrow + '</th>';
  }).join('') + '</tr></thead>';
  const tbody = '<tbody>' + sorted.map(function(row) {
    const cls = extraRowClass ? extraRowClass(row) : '';
    return '<tr class="' + cls + '">' + columns.map(function(c) {
      const v = row[c.key];
      const display = c.render ? c.render(row) : (c.fmt ? c.fmt(v) : (v == null ? '\\u2014' : v));
      return '<td class="' + (c.name ? 'name' : '') + '">' + display + '</td>';
    }).join('') + '</tr>';
  }).join('') + '</tbody>';
  const table = document.getElementById(tableId);
  table.innerHTML = thead + tbody;
  table.querySelectorAll('th').forEach(function(th) {
    th.addEventListener('click', function() {
      const key = th.dataset.key;
      if (st.key === key) { st.dir = st.dir === 'asc' ? 'desc' : 'asc'; }
      else { st.key = key; st.dir = 'desc'; }
      renderSortableTable(tableId, columns, rows, extraRowClass);
    });
  });
}

document.querySelectorAll('.team-tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.team-tab').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    currentTeam = btn.dataset.team;
    render();
  });
});
toggle.addEventListener('change', render);

const BATTING_COLS = [
  { key: 'name', label: 'Player', name: true, render: nameLink, sortKey: 'name' },
  { key: 'pos', label: 'Pos' },
  { key: 'AB', label: 'AB' }, { key: 'R', label: 'R' }, { key: 'H', label: 'H' },
  { key: 'HR', label: 'HR' }, { key: 'RBI', label: 'RBI' }, { key: 'BB', label: 'BB' },
  { key: 'SO', label: 'SO' }, { key: 'SB', label: 'SB' },
  { key: 'AVG', label: 'AVG', fmt: fmt3 }, { key: 'OBP', label: 'OBP', fmt: fmt3 },
  { key: 'SLG', label: 'SLG', fmt: fmt3 }, { key: 'OPS', label: 'OPS', fmt: fmt3 },
];
const PITCHING_COLS = [
  { key: 'name', label: 'Player', name: true, render: nameLink, sortKey: 'name' },
  { key: 'IP', label: 'IP', fmt: fmtIP }, { key: 'W', label: 'W' }, { key: 'L', label: 'L' },
  { key: 'SV', label: 'SV' }, { key: 'ERA', label: 'ERA', fmt: function(v){ return v==null?'\\u2014':v.toFixed(2); } },
  { key: 'WHIP', label: 'WHIP', fmt: function(v){ return v==null?'\\u2014':v.toFixed(2); } },
  { key: 'K_pitch', label: 'SO' }, { key: 'BB_allowed', label: 'BB' }, { key: 'ER', label: 'ER' },
];
const ROSTER_COLS = [
  { key: 'name', label: 'Player', name: true, render: nameLink, sortKey: 'name' },
  { key: 'age', label: 'Age' }, { key: 'pos', label: 'Pos' },
  { key: 'btDisplay', label: 'B/T', sortKey: 'bats', render: function(p){ return (p.bats||'\\u2014') + '/' + (p.throws||'\\u2014'); } },
  { key: 'draftPick', label: 'Draft', render: fmtDraft },
  { key: 'status', label: 'Status' },
];
function unsignedClass(p) { return p.status === 'Signed' ? '' : 'unsigned'; }

function renderPCA() {
  const width = 640, height = 380;
  const margin = { top: 16, right: 20, bottom: 44, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const xs = PCA_PLAYERS.map(function(p){ return p.pc1; }), ys = PCA_PLAYERS.map(function(p){ return p.pc2; });
  const pad = 0.12;
  const xMin0 = Math.min.apply(null, xs), xMax0 = Math.max.apply(null, xs), xSpan = (xMax0-xMin0)||1;
  const yMin0 = Math.min.apply(null, ys), yMax0 = Math.max.apply(null, ys), ySpan = (yMax0-yMin0)||1;
  const xMin = xMin0 - xSpan*pad, xMax = xMax0 + xSpan*pad;
  const yMin = yMin0 - ySpan*pad, yMax = yMax0 + ySpan*pad;
  const sx = function(v){ return margin.left + (v-xMin)/(xMax-xMin)*plotW; };
  const sy = function(v){ return margin.top + plotH - (v-yMin)/(yMax-yMin)*plotH; };

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '">';
  for (let i=0;i<=5;i++){
    const v = yMin + (yMax-yMin)*i/5, y = sy(v);
    svg += '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (width-margin.right) + '" y2="' + y + '" class="gridline"/>';
    svg += '<text x="' + (margin.left-8) + '" y="' + (y+4) + '" class="axis-label" text-anchor="end">' + v.toFixed(1) + '</text>';
  }
  for (let i=0;i<=5;i++){
    const v = xMin + (xMax-xMin)*i/5, x = sx(v);
    svg += '<text x="' + x + '" y="' + (height-margin.bottom+20) + '" class="axis-label" text-anchor="middle">' + v.toFixed(1) + '</text>';
  }
  svg += '<line x1="' + margin.left + '" y1="' + margin.top + '" x2="' + margin.left + '" y2="' + (height-margin.bottom) + '" class="axis-line"/>';
  svg += '<line x1="' + margin.left + '" y1="' + (height-margin.bottom) + '" x2="' + (width-margin.right) + '" y2="' + (height-margin.bottom) + '" class="axis-line"/>';

  // faded (other teams) first, then highlighted team on top
  const others = PCA_PLAYERS.filter(function(p){ return p.team !== currentTeam; });
  const mine = PCA_PLAYERS.filter(function(p){ return p.team === currentTeam; });
  others.forEach(function(p) {
    const cx = sx(p.pc1), cy = sy(p.pc2);
    svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4.5" fill="' + (TEAM_COLOR[p.team]||'#888') + '" fill-opacity="0.18" stroke="none"/>';
  });
  mine.forEach(function(p, i) {
    const cx = sx(p.pc1), cy = sy(p.pc2);
    const tip = escapeAttr(p.name + ' \\u2014 PC1: ' + p.pc1.toFixed(2) + ', PC2: ' + p.pc2.toFixed(2));
    svg += '<circle class="pt-team" data-i="' + i + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="6" fill="' + TEAM_COLOR[currentTeam] + '" fill-opacity="0.9" stroke="var(--surface-1)" stroke-width="1.5" data-tip="' + tip + '"/>';
  });

  svg += '<text x="' + (margin.left + plotW/2) + '" y="' + (height-6) + '" class="axis-title" text-anchor="middle">PC1 (' + (PCA_EXPLAINED[0]*100).toFixed(1) + '%)</text>';
  svg += '<text x="14" y="' + (margin.top + plotH/2) + '" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ' + (margin.top + plotH/2) + ')">PC2 (' + (PCA_EXPLAINED[1]*100).toFixed(1) + '%)</text>';
  svg += '</svg>';
  document.getElementById('pcaChart').innerHTML = svg;

  const tip = document.getElementById('pcaTooltip');
  document.querySelectorAll('circle.pt-team').forEach(function(c) {
    c.addEventListener('mousemove', function(e) {
      tip.textContent = c.dataset.tip;
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY + 10) + 'px';
      tip.style.opacity = '1';
    });
    c.addEventListener('mouseleave', function(){ tip.style.opacity = '0'; });
  });
}

function render() {
  const includeUnsigned = toggle.checked;
  const t = TEAMS.find(function(x){ return x.code === currentTeam; });
  const allPlayers = PLAYERS.filter(function(p){ return p.team === currentTeam; });
  const players = includeUnsigned ? allPlayers : allPlayers.filter(function(p){ return p.status === 'Signed'; });

  document.getElementById('teamHeader').innerHTML =
    '<div class="team-header"><div class="bar" style="background:' + TEAM_COLOR[currentTeam] + '"></div>' +
    '<div class="head"><div class="nickname" style="color:' + TEAM_COLOR[currentTeam] + '">' + TEAM_CITY[currentTeam] + ' ' + TEAM_NICKNAME[currentTeam] + '</div>' +
    '<div class="rec">' + t.W + '\\u2013' + t.L + '</div><div class="place">' + placeLabel(t) + ' place \\u00b7 ' + t.pct.toFixed(3).replace(/^0\\./,'.') + '</div></div>' +
    '<div class="stats">' +
    '<div class="stat-cell"><div class="v">' + t.perGame.R.toFixed(1) + '</div><div class="k">R/G</div></div>' +
    '<div class="stat-cell"><div class="v">' + t.perGame.RA.toFixed(1) + '</div><div class="k">RA/G</div></div>' +
    '<div class="stat-cell ' + (t.runDiff>0?'diff-pos':t.runDiff<0?'diff-neg':'') + '"><div class="v">' + (t.runDiff>0?'+':'') + t.runDiff + '</div><div class="k">Run Diff</div></div>' +
    '<div class="stat-cell"><div class="v">' + fmt3(t.AVG) + '</div><div class="k">AVG</div></div>' +
    '<div class="stat-cell"><div class="v">' + (t.ERA!=null?t.ERA.toFixed(2):'\\u2014') + '</div><div class="k">ERA</div></div>' +
    '<div class="stat-cell"><div class="v">' + (t.WHIP!=null?t.WHIP.toFixed(2):'\\u2014') + '</div><div class="k">WHIP</div></div>' +
    '<div class="stat-cell"><div class="v">' + t.perGame.HR.toFixed(1) + '</div><div class="k">HR/G</div></div>' +
    '<div class="stat-cell"><div class="v">' + fmt3(t.FPCT) + '</div><div class="k">FPCT</div></div>' +
    '</div></div>';

  const batters = players.filter(function(p){ return p.AB != null; });
  renderSortableTable('battingTable', BATTING_COLS, batters, unsignedClass, 'AB');

  const pitchers = players.filter(function(p){ return p.IP != null; });
  renderSortableTable('pitchingTable', PITCHING_COLS, pitchers, unsignedClass, 'IP');

  renderSortableTable('rosterTable', ROSTER_COLS, players, unsignedClass, 'age');

  renderPCA();
}

render();
})();
</script>
`;

fs.writeFileSync('./output/wpbl_team.html', html);
console.log('Wrote wpbl_team.html');
