const fs = require('fs');
const d = require('./output/result.json');

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_NAME = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };
const S_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];
const cssVar = t => `var(--${t.toLowerCase()})`;

const scrapedDate = new Date(d.scrapedAt);
const dateStr = scrapedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Flat per-player list (all teams) — the client recomputes every aggregate below
// from this when the Signed/Drafted toggle changes, so nothing on the page is
// server-frozen to one toggle state.
const ALL_PLAYERS = d.bio.rosterByTeam.flatMap(t => t.players.map(p => ({ ...p, team: t.team })));
const playersJson = JSON.stringify(ALL_PLAYERS);
const teamCodesJson = JSON.stringify(d.teamCodes);
const teamColorJson = JSON.stringify(TEAM_COLOR);
const teamNameJson = JSON.stringify(TEAM_NAME);
const paletteJson = JSON.stringify(S_PALETTE);

const html = `<title>WPBL 2026 Player Bios</title>
<style>
.viz-root {
  color-scheme: light;
  --surface-1: #ffffff; --page: #f5f4f0;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --la: ${TEAM_COLOR.LA}; --ny: ${TEAM_COLOR.NY}; --sf: ${TEAM_COLOR.SF}; --bos: ${TEAM_COLOR.BOS};
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text-primary); background: var(--page);
  padding: 28px 20px 48px; box-sizing: border-box;
}
.viz-root * { box-sizing: border-box; }
.wrap { max-width: 1080px; margin: 0 auto; }
header.page-head { margin-bottom: 18px; }
header.page-head h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; }
header.page-head p { margin: 0; color: var(--text-secondary); font-size: 13.5px; }
header.page-head .cite { color: var(--text-muted); font-size: 12px; margin-top: 6px; }
.toggle-row { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; cursor: pointer; width: fit-content; }
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
.stat-tile .n { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat-tile .l { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; margin-bottom: 20px; }
.card h2 { font-size: 15px; margin: 0 0 2px; }
.card .sub { font-size: 12.5px; color: var(--text-muted); margin: 0 0 18px; }
.hist { display: flex; align-items: flex-end; gap: 18px; height: 160px; border-bottom: 1px solid var(--baseline); padding: 0 8px; margin-top: 6px; }
.hist-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; flex: 1; }
.hist-col .val { font-size: 12px; font-weight: 600; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
.hist-col .bar { width: 100%; max-width: 64px; border-radius: 4px 4px 0 0; background: #1d4fd6; min-height: 2px; }
.hist-labels { display: flex; gap: 18px; padding: 0 8px; margin-top: 8px; }
.hist-labels span { flex: 1; text-align: center; font-size: 11.5px; color: var(--text-muted); }
.hbar-row { display: grid; grid-template-columns: 1fr 90px; align-items: center; gap: 10px; padding: 7px 0; }
.hbar-row .name-wrap { display: flex; flex-direction: column; gap: 4px; }
.hbar-row .name { font-size: 13px; font-weight: 500; }
.hbar-track { background: var(--grid); border-radius: 4px; height: 12px; overflow: hidden; }
.hbar-fill { height: 100%; border-radius: 4px; }
.hbar-row .stat { text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.hbar-row .stat b { color: var(--text-primary); font-weight: 700; }
.two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
.team-age-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.team-age-tile { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.team-age-tile .dot-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.team-age-tile i.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.team-age-tile .city { font-weight: 600; font-size: 13px; }
.team-age-tile .n { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.team-age-tile .l { font-size: 11.5px; color: var(--text-muted); }
.seg-block { margin-bottom: 16px; }
.seg-block h4 { font-size: 12.5px; font-weight: 600; margin: 0 0 8px; color: var(--text-secondary); }
.seg-bar { display: flex; height: 22px; border-radius: 6px; overflow: hidden; }
.seg-bar div { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #fff; }
.seg-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: var(--text-secondary); }
.seg-legend span { display: inline-flex; align-items: center; gap: 6px; }
.seg-legend i { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
.roster-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.roster-panel h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; margin: 0 0 10px; }
.roster-panel h3 i.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.roster-panel h3 .roster-count { font-weight: 400; color: var(--text-muted); font-size: 12.5px; }
table.roster-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 22px; }
table.roster-table th { text-align: left; font-weight: 600; color: var(--text-muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.02em; padding: 5px 6px; border-bottom: 1px solid var(--baseline); }
table.roster-table td { padding: 6px 6px; border-bottom: 1px solid var(--grid); color: var(--text-primary); }
table.roster-table td.age, table.roster-table td.bt { font-variant-numeric: tabular-nums; white-space: nowrap; }
table.roster-table td.status { font-size: 11px; color: var(--text-muted); }
table.roster-table tr.unsigned td { color: var(--text-muted); }
table.roster-table tr.unsigned td.status { font-style: italic; }
table.roster-table tbody tr:last-child td { border-bottom: none; }
a.player-link { color: inherit; text-decoration: none; }
a.player-link:hover { text-decoration: underline; }
@media (max-width: 760px) { .stat-row { grid-template-columns: repeat(2, 1fr); } .team-age-grid { grid-template-columns: repeat(2, 1fr); } .two-col, .roster-grid { grid-template-columns: 1fr; } }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <h1>WPBL 2026 — Player Bios &amp; Demographics</h1>
      <p id="headSub"></p>
      <p class="cite">Source: womensprobaseballleague.com/prospect-ranking (full Drafted Players list, Signed + Drafted status) — through ${dateStr} · auto-updated daily. Site does not publish height/weight.</p>
    </header>
    <label class="toggle-row"><input type="checkbox" id="showUnsigned" checked> Include drafted (not yet signed) players</label>
    <div class="stat-row" id="statRow"></div>
    <div class="card">
      <h2>Age Distribution</h2>
      <p class="sub" id="histSub"></p>
      <div class="hist" id="hist"></div>
      <div class="hist-labels" id="histLabels"></div>
    </div>
    <div class="two-col">
      <div class="card">
        <h2>Hometown Country</h2>
        <p class="sub">Where each player calls home</p>
        <div class="hbar-list" id="nationalityList"></div>
      </div>
      <div class="card">
        <h2>Average Age by Team</h2>
        <p class="sub">Years</p>
        <div class="team-age-grid" id="teamAgeGrid"></div>
        <div style="margin-top:20px;">
          <div class="seg-block"><h4>Bats</h4><div class="seg-bar" id="batsSegBar"></div><div class="seg-legend" id="batsSegLegend"></div></div>
          <div class="seg-block"><h4>Throws</h4><div class="seg-bar" id="throwsSegBar"></div><div class="seg-legend" id="throwsSegLegend"></div></div>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Full Roster</h2>
      <p class="sub" id="rosterSub"></p>
      <div class="roster-grid" id="rosterGrid"></div>
    </div>
  </div>
</div>
<script>
(function(){
const ALL_PLAYERS = ${playersJson};
const TEAM_CODES = ${teamCodesJson};
const TEAM_COLOR = ${teamColorJson};
const TEAM_NAME = ${teamNameJson};
const S_PALETTE = ${paletteJson};
const AGE_BUCKETS = [[18,21],[22,25],[26,29],[30,33],[34,38]];

const toggle = document.getElementById('showUnsigned');

function nameLink(p) {
  return p.url ? '<a class="player-link" href="' + p.url + '" target="_blank" rel="noopener">' + p.name + '</a>' : p.name;
}
function fmtDraft(p) {
  return p.round != null ? 'R' + p.round + ' \\u00b7 #' + p.pickOverall : '\\u2014';
}
function countryOf(hometown) {
  if (!hometown) return 'Unknown';
  const parts = hometown.split(',').map(s => s.trim());
  return parts[parts.length - 1];
}

function render() {
  const includeUnsigned = toggle.checked;
  const players = includeUnsigned ? ALL_PLAYERS : ALL_PLAYERS.filter(p => p.status === 'Signed');
  const signedCount = ALL_PLAYERS.filter(p => p.status === 'Signed').length;
  const draftedCount = ALL_PLAYERS.length - signedCount;

  document.getElementById('headSub').textContent = 'All ' + ALL_PLAYERS.length + ' drafted players across Los Angeles, New York, San Francisco & Boston \\u2014 ' + signedCount + ' signed, ' + draftedCount + ' drafted and not yet signed';
  document.getElementById('histSub').textContent = players.length + ' players, league-wide' + (includeUnsigned ? '' : ' (signed only)');
  document.getElementById('rosterSub').textContent = players.length + ' players, sorted by age within team' + (includeUnsigned ? ' \\u2014 greyed rows are drafted but not yet signed' : ' (signed only)');

  // ---- stat tiles ----
  const ages = players.map(p => p.age).filter(a => a != null);
  const avgAge = ages.reduce((a,b)=>a+b,0) / (ages.length || 1);
  const sortedAges = [...ages].sort((a,b)=>a-b);
  const medianAge = sortedAges.length ? (sortedAges.length % 2 ? sortedAges[(sortedAges.length-1)/2] : (sortedAges[sortedAges.length/2-1]+sortedAges[sortedAges.length/2])/2) : 0;
  const countries = new Set(players.map(p => countryOf(p.hometown)));
  document.getElementById('statRow').innerHTML =
    '<div class="stat-tile"><div class="n">' + avgAge.toFixed(1) + '</div><div class="l">Average age</div></div>' +
    '<div class="stat-tile"><div class="n">' + medianAge + '</div><div class="l">Median age</div></div>' +
    '<div class="stat-tile"><div class="n">' + (ages.length?Math.min(...ages):'\\u2014') + '\\u2013' + (ages.length?Math.max(...ages):'\\u2014') + '</div><div class="l">Age range</div></div>' +
    '<div class="stat-tile"><div class="n">' + countries.size + '</div><div class="l">Countries represented</div></div>';

  // ---- age histogram ----
  const ageDist = AGE_BUCKETS.map(([lo,hi]) => ({ label: lo + '\\u2013' + hi, count: ages.filter(a => a >= lo && a <= hi).length }));
  const maxBucket = Math.max(...ageDist.map(b => b.count), 1);
  document.getElementById('hist').innerHTML = ageDist.map(b => '<div class="hist-col"><span class="val">' + b.count + '</span><div class="bar" style="height:' + (b.count/maxBucket*100) + '%"></div></div>').join('');
  document.getElementById('histLabels').innerHTML = ageDist.map(b => '<span>' + b.label + '</span>').join('');

  // ---- nationality ----
  const countryCounts = {};
  players.forEach(p => { const c = countryOf(p.hometown); countryCounts[c] = (countryCounts[c]||0)+1; });
  const nationality = Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]);
  const maxCountry = nationality[0]?.[1] || 1;
  document.getElementById('nationalityList').innerHTML = nationality.map(([country,count],i) =>
    '<div class="hbar-row"><div class="name-wrap"><span class="name">' + country + '</span><div class="hbar-track"><div class="hbar-fill" style="width:' + (count/maxCountry*100).toFixed(1) + '%;background:' + S_PALETTE[i % S_PALETTE.length] + '"></div></div></div><span class="stat"><b>' + count + '</b> player' + (count===1?'':'s') + '</span></div>'
  ).join('');

  // ---- avg age by team ----
  document.getElementById('teamAgeGrid').innerHTML = TEAM_CODES.map(code => {
    const list = players.filter(p => p.team === code && p.age != null);
    const avg = list.length ? list.reduce((a,b)=>a+b.age,0)/list.length : 0;
    return '<div class="team-age-tile"><div class="dot-row"><i class="dot" style="background:var(--' + code.toLowerCase() + ')"></i><span class="city">' + code + '</span></div><div class="n">' + avg.toFixed(1) + '</div><div class="l">avg age</div></div>';
  }).join('');

  // ---- bats/throws splits ----
  function segBar(field, labelMap) {
    const counts = {};
    players.forEach(p => { const v = p[field] || 'Unknown'; counts[v] = (counts[v]||0)+1; });
    const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const colors = ['#1d4fd6', '#eb6834', '#1f7a45', '#eda100'];
    const bar = entries.map(([k,v],i) => '<div style="width:' + (v/total*100).toFixed(1) + '%;background:' + colors[i%colors.length] + '">' + (v/total > 0.12 ? (labelMap[k]||k) + ' \\u00b7 ' + v : '') + '</div>').join('');
    const legend = entries.map(([k,v],i) => '<span><i style="background:' + colors[i%colors.length] + '"></i>' + (labelMap[k]||k) + ' (' + v + ')</span>').join('');
    return { bar, legend };
  }
  const batsSeg = segBar('bats', { R: 'Right', L: 'Left', S: 'Switch' });
  const throwsSeg = segBar('throws', { R: 'Right', L: 'Left' });
  document.getElementById('batsSegBar').innerHTML = batsSeg.bar;
  document.getElementById('batsSegLegend').innerHTML = batsSeg.legend;
  document.getElementById('throwsSegBar').innerHTML = throwsSeg.bar;
  document.getElementById('throwsSegLegend').innerHTML = throwsSeg.legend;

  // ---- full roster ----
  document.getElementById('rosterGrid').innerHTML = TEAM_CODES.map(code => {
    const list = players.filter(p => p.team === code).sort((a,b) => (b.age||0) - (a.age||0));
    const rows = list.map(p => '<tr class="' + (p.status==='Signed'?'':'unsigned') + '"><td>' + nameLink(p) + '</td><td class="age">' + (p.age ?? '\\u2014') + '</td><td>' + p.pos + '</td><td>' + p.hometown + '</td><td class="bt">' + p.bats + '/' + p.throws + '</td><td class="bt">' + fmtDraft(p) + '</td><td class="status">' + p.status + '</td></tr>').join('');
    return '<div class="roster-panel"><h3><i class="dot" style="background:var(--' + code.toLowerCase() + ')"></i>' + TEAM_NAME[code] + ' <span class="roster-count">(' + list.length + ')</span></h3>' +
      '<table class="roster-table"><thead><tr><th>Player</th><th>Age</th><th>Pos</th><th>Hometown</th><th>B/T</th><th>Draft</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }).join('');
}

toggle.addEventListener('change', render);
render();
})();
</script>
`;

fs.writeFileSync('./output/wpbl_bios.html', html);
console.log('Wrote wpbl_bios.html');
