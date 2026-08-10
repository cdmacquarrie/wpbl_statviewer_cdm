const fs = require('fs');
const d = require('./output/result.json');

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_NAME = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };
const cssVar = t => `var(--${t.toLowerCase()})`;

function fmt3(v) { return v == null ? '—' : v.toFixed(3).replace(/^0\./,'.').replace(/^-0\./,'-.'); }
function fmtIP(ip) { if (ip==null) return '—'; const whole = Math.floor(ip); const frac = Math.round((ip-whole)*3); return `${whole}.${frac}`; }
function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th','st','nd','rd'][n % 10] || 'th'}`;
}
function placeLabel(t, teams) {
  const tied = teams.filter(x => x.place === t.place).length > 1;
  return (tied ? 'T-' : '') + ordinal(t.place);
}

const scrapedDate = new Date(d.scrapedAt);
const dateStr = scrapedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const teamCardsHtml = d.teams.map(t => `
      <div class="team-card">
        <div class="bar" style="background:${cssVar(t.code)}"></div>
        <div class="head">
          <div class="city" style="color:${cssVar(t.code)}">${t.name}</div>
          <div class="rec">${t.W}–${t.L}</div>
          <div class="place">${placeLabel(t, d.teams)} place · ${t.pct.toFixed(3).replace(/^0\./,'.')}</div>
        </div>
        <div class="stats">
          <div class="stat-cell"><div class="v">${t.perGame.R.toFixed(1)}</div><div class="k">R/G</div></div>
          <div class="stat-cell"><div class="v">${t.perGame.RA.toFixed(1)}</div><div class="k">RA/G</div></div>
          <div class="stat-cell ${t.runDiff>0?'diff-pos':t.runDiff<0?'diff-neg':''}"><div class="v">${t.runDiff>0?'+':''}${t.runDiff}</div><div class="k">Run Diff</div></div>
          <div class="stat-cell"><div class="v">${fmt3(t.AVG)}</div><div class="k">AVG</div></div>
          <div class="stat-cell"><div class="v">${t.ERA?.toFixed(2) ?? '—'}</div><div class="k">ERA</div></div>
          <div class="stat-cell"><div class="v">${t.WHIP?.toFixed(2) ?? '—'}</div><div class="k">WHIP</div></div>
          <div class="stat-cell"><div class="v">${t.perGame.HR.toFixed(1)}</div><div class="k">HR/G</div></div>
          <div class="stat-cell"><div class="v">${fmt3(t.FPCT)}</div><div class="k">FPCT</div></div>
        </div>
      </div>`).join('');

const standingsHtml = d.teams.map(t => `
        <div class="team-tile">
          <div class="dot-row"><i class="dot" style="background:${cssVar(t.code)}"></i><span class="city">${t.name}</span></div>
          <div class="rec">${t.W}–${t.L}</div>
          <div class="meta">${t.pct.toFixed(3).replace(/^0\./,'.')} PCT &middot; GB ${t.gb===0?'—':t.gb}</div>
        </div>`).join('');

const legendHtml = d.teamCodes.map(c => `<span><i style="background:var(--${c.toLowerCase()})"></i>${TEAM_NAME[c]}</span>`).join('\n      ');

// ---- leaderboard datasets + card defs, embedded for client-side re-render on toggle ----
const battingSub = 'Qualified (5+ at-bats)';
const pitchingSub = 'Qualified (2.0+ innings pitched)';
const BATTING_CARDS = [
  { title: 'Batting Average', sub: battingSub, list: 'qualBatters', key: 'AVG', take: 8, fmt: 'fmt3' },
  { title: 'On-Base Percentage', sub: battingSub, list: 'qualBatters', key: 'OBP', take: 8, fmt: 'fmt3' },
  { title: 'Slugging Percentage', sub: battingSub, list: 'qualBatters', key: 'SLG', take: 8, fmt: 'fmt3' },
  { title: 'OPS', sub: battingSub, list: 'qualBatters', key: 'OPS', take: 8, fmt: 'fmt3' },
  { title: 'Home Runs', sub: battingSub, list: 'qualBatters', key: 'HR', take: 8, unit: ' HR' },
  { title: 'RBI', sub: battingSub, list: 'qualBatters', key: 'RBI', take: 8, unit: ' RBI' },
  { title: 'Runs', sub: battingSub, list: 'qualBatters', key: 'R', take: 8, unit: ' R' },
  { title: 'Hits', sub: battingSub, list: 'qualBatters', key: 'H', take: 8, unit: ' H' },
  { title: 'Doubles', sub: battingSub, list: 'qualBatters', key: '2B', take: 8, unit: ' 2B' },
  { title: 'Triples', sub: battingSub, list: 'qualBatters', key: '3B', take: 8, unit: ' 3B' },
  { title: 'Walks', sub: battingSub, list: 'qualBatters', key: 'BB', take: 8, unit: ' BB' },
  { title: 'Stolen Bases', sub: 'Top base-stealers, all players', list: 'sbLeaders', key: 'SB', take: 6, unit: ' SB' },
];
const PITCHING_CARDS = [
  { title: 'ERA', sub: pitchingSub, list: 'qualPitchers', key: 'ERA', take: 6, fmt: 'fmt2', higherBetter: false },
  { title: 'WHIP', sub: pitchingSub, list: 'qualPitchers', key: 'WHIP', take: 6, fmt: 'fmt2', higherBetter: false },
  { title: 'Wins', sub: pitchingSub, list: 'qualPitchers', key: 'W', take: 6, unit: ' W' },
  { title: 'Saves', sub: pitchingSub, list: 'qualPitchers', key: 'SV', take: 6, unit: ' SV' },
  { title: 'Strikeouts (Pitching)', sub: 'All qualified pitchers', list: 'soLeaders', key: 'SO', take: 6, unit: ' SO' },
  { title: 'Fewest Walks Allowed', sub: pitchingSub, list: 'qualPitchers', key: 'BB', take: 6, unit: ' BB', higherBetter: false },
  { title: 'Fewest Earned Runs', sub: pitchingSub, list: 'qualPitchers', key: 'ER', take: 6, unit: ' ER', higherBetter: false },
];

const datasetsJson = JSON.stringify({
  qualBatters: d.qualBatters, sbLeaders: d.sbLeaders, qualPitchers: d.qualPitchers, soLeaders: d.soLeaders,
});
const battingCardsJson = JSON.stringify(BATTING_CARDS);
const pitchingCardsJson = JSON.stringify(PITCHING_CARDS);
const teamColorJson = JSON.stringify(TEAM_COLOR);

const html = `<title>WPBL 2026 Stats</title>
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
header.page-head { margin-bottom: 26px; }
header.page-head .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
header.page-head h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
header.page-head p { margin: 0; color: var(--text-secondary); font-size: 13.5px; }
header.page-head .cite { color: var(--text-muted); font-size: 11.5px; margin-top: 8px; }
.legend-row { display: flex; gap: 18px; flex-wrap: wrap; margin: 16px 0 18px; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600; }
.legend-row span { display: inline-flex; align-items: center; gap: 6px; }
.legend-row i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.toggle-row { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; cursor: pointer; width: fit-content; }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 32px 0 12px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--grid); }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; margin-bottom: 18px; }
.card h2 { font-size: 14px; margin: 0 0 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
.card .sub { font-size: 12px; color: var(--text-muted); margin: 0 0 16px; }
.team-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.team-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.team-card .bar { height: 5px; }
.team-card .head { padding: 14px 16px 10px; }
.team-card .head .city { font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
.team-card .head .rec { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.team-card .head .place { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.team-card .stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--grid); }
.team-card .stat-cell { padding: 10px 6px; text-align: center; border-right: 1px solid var(--grid); border-bottom: 1px solid var(--grid); }
.team-card .stat-cell:nth-child(4n) { border-right: none; }
.team-card .stat-cell .v { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.team-card .stat-cell .k { font-size: 9.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.team-card .stat-cell.diff-pos .v { color: var(--good); }
.team-card .stat-cell.diff-neg .v { color: var(--bad); }
.standings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.team-tile { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; background: var(--surface-1); }
.team-tile .dot-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.team-tile i.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.team-tile .city { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.02em; }
.team-tile .rec { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: 2px; }
.team-tile .meta { font-size: 11.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.hbar-row { display: grid; grid-template-columns: 22px 1fr 100px; align-items: center; gap: 10px; padding: 7px 0; }
.hbar-row .rank { font-size: 11.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; font-weight: 700; }
.hbar-row .name-wrap { display: flex; flex-direction: column; gap: 4px; }
.hbar-row .name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.hbar-row .name i.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.hbar-track { background: var(--grid); border-radius: 5px; height: 11px; overflow: hidden; }
.hbar-fill { height: 100%; border-radius: 5px; }
.hbar-row .stat { text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.hbar-row .stat b { color: var(--text-primary); font-weight: 800; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.leader-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
a.player-link { color: inherit; text-decoration: none; }
a.player-link:hover { text-decoration: underline; }
table.pitch-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
table.pitch-table th { text-align: right; font-weight: 700; color: var(--text-muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; padding: 6px 8px; border-bottom: 1px solid var(--baseline); }
table.pitch-table th:first-child, table.pitch-table td:first-child { text-align: left; }
table.pitch-table td { padding: 8px 8px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; text-align: right; color: var(--text-primary); }
table.pitch-table td.name { font-variant-numeric: initial; }
table.pitch-table .player-cell { display: flex; align-items: center; gap: 7px; font-weight: 600; }
table.pitch-table .player-cell i.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
table.pitch-table tbody tr:last-child td { border-bottom: none; }
@media (max-width: 760px) { .standings-grid, .team-grid { grid-template-columns: repeat(2, 1fr); } .two-col { grid-template-columns: 1fr; } }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <div class="kicker">2026 Regular Season</div>
      <h1>WPBL Team &amp; Player Stats</h1>
      <p>Los Angeles, New York, San Francisco &amp; Boston — inaugural WPBL season</p>
      <p class="cite">Source: womensprobaseballleague.com/stats — through ${dateStr} · auto-updated daily</p>
    </header>
    <div class="legend-row">
      ${legendHtml}
    </div>
    <div class="section-title">Team Snapshot — Per Game</div>
    <div class="team-grid">${teamCardsHtml}
    </div>
    <div class="section-title">Standings</div>
    <div class="card"><div class="standings-grid">${standingsHtml}
      </div>
    </div>
    <label class="toggle-row"><input type="checkbox" id="unsignedToggle" checked> Include drafted (not yet signed) players</label>
    <div class="section-title">Batting Leaderboards</div>
    <div class="leader-grid" id="battingLeaderGrid"></div>
    <div class="section-title">Pitching Leaderboards</div>
    <div class="card">
      <h2>Pitching Leaders</h2>
      <p class="sub">Qualified (2.0+ innings pitched), sorted by ERA</p>
      <table class="pitch-table">
        <thead><tr><th>Pitcher</th><th>IP</th><th>W-L</th><th>ERA</th><th>SO</th><th>WHIP</th></tr></thead>
        <tbody id="pitchTableBody"></tbody>
      </table>
    </div>
    <div class="leader-grid" id="pitchingLeaderGrid"></div>
  </div>
</div>
<script>
const DATA = ${datasetsJson};
const BATTING_CARDS = ${battingCardsJson};
const PITCHING_CARDS = ${pitchingCardsJson};
const TEAM_COLOR = ${teamColorJson};
const cssVar = t => 'var(--' + t.toLowerCase() + ')';
const FMT = {
  fmt3: v => v == null ? '\\u2014' : v.toFixed(3).replace(/^0\\./,'.').replace(/^-0\\./,'-.'),
  fmt2: v => v == null ? '\\u2014' : v.toFixed(2),
  raw: v => v,
};

const toggle = document.getElementById('unsignedToggle');

function nameLink(name, url) {
  return url ? '<a class="player-link" href="' + url + '" target="_blank" rel="noopener">' + name + '</a>' : name;
}
function hbarRow(rank, name, team, width, statLabel, url) {
  return '<div class="hbar-row"><span class="rank">' + rank + '</span><div class="name-wrap"><span class="name"><i class="dot" style="background:' + cssVar(team) + '"></i>' + nameLink(name, url) + '</span><div class="hbar-track"><div class="hbar-fill" style="width:' + width.toFixed(1) + '%;background:' + cssVar(team) + '"></div></div></div><span class="stat">' + statLabel + '</span></div>';
}
function leaderboardCard(def, players) {
  const fmt = FMT[def.fmt] || FMT.raw;
  const higherBetter = def.higherBetter !== false;
  const sorted = players.filter(p => p[def.key] != null).sort((a,b) => higherBetter ? b[def.key]-a[def.key] : a[def.key]-b[def.key]);
  let rank = 0, prev = null;
  sorted.forEach((r,i) => { if (r[def.key] !== prev) { rank = i+1; prev = r[def.key]; } r._rank = rank; });
  const top = sorted.slice(0, def.take);
  const vals = top.map(p => p[def.key]);
  const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
  const rows = top.map(p => {
    const width = higherBetter
      ? (max > 0 ? p[def.key] / max * 100 : 0)
      : (max - min > 0 ? (max - p[def.key]) / (max - min) * 100 : 100);
    return hbarRow(p._rank, p.name, p.team, width, '<b>' + fmt(p[def.key]) + '</b>' + (def.unit||''), p.url);
  }).join('');
  const extra = sorted.length - top.length;
  return '<div class="card"><h2>' + def.title + '</h2><p class="sub">' + def.sub + '</p><div class="hbar-list">' + rows + '</div>' +
    (extra > 0 ? '<p class="sub" style="margin:14px 0 0;">' + extra + ' more player' + (extra===1?'':'s') + ' not shown</p>' : '') + '</div>';
}

function render() {
  const includeUnsigned = toggle.checked;
  function pool(name) {
    const list = DATA[name];
    return includeUnsigned ? list : list.filter(p => p.status === 'Signed');
  }
  document.getElementById('battingLeaderGrid').innerHTML = BATTING_CARDS.map(def => leaderboardCard(def, pool(def.list))).join('');
  document.getElementById('pitchingLeaderGrid').innerHTML = PITCHING_CARDS.map(def => leaderboardCard(def, pool(def.list))).join('');

  const topPitchers = pool('qualPitchers').slice().sort((a,b) => a.ERA - b.ERA).slice(0, 8);
  document.getElementById('pitchTableBody').innerHTML = topPitchers.map(p =>
    '<tr><td class="name"><div class="player-cell"><i class="dot" style="background:' + cssVar(p.team) + '"></i>' + nameLink(p.name, p.url) + '</div></td><td>' +
    (p.IP == null ? '\\u2014' : Math.floor(p.IP) + '.' + Math.round((p.IP-Math.floor(p.IP))*3)) + '</td><td>' + p.W + '-' + p.L + '</td><td>' + p.ERA.toFixed(2) + '</td><td>' + p.SO + '</td><td>' + p.WHIP.toFixed(2) + '</td></tr>'
  ).join('');
}

toggle.addEventListener('change', render);
render();
</script>
`;

fs.writeFileSync('./output/wpbl_stats.html', html);
console.log('Wrote wpbl_stats.html');
