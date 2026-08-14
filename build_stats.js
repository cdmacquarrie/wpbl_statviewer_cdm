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
const dateStr = scrapedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });

// ---- season trend: game-by-game line charts from RetroWPBL's community game
// log (see README for attribution). One path per team, x = game number so
// teams with different game counts still compare cleanly. ----
function escapeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function multiLineSVG({ valueKey, yLabel, yFmt = v => v.toFixed(2), tipFmt, width = 800, height = 300 }) {
  const margin = { top: 16, right: 40, bottom: 36, left: 52 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const seriesByTeam = d.teamCodes.map(code => ({ code, series: d.seasonTrend[code] || [] }));
  const maxGames = Math.max(1, ...seriesByTeam.map(s => s.series.length));
  const allVals = seriesByTeam.flatMap(s => s.series.map(p => p[valueKey]));
  if (!allVals.length) return '<p class="sub">No game log data available yet.</p>';
  let yMin = Math.min(0, ...allVals), yMax = Math.max(0.001, ...allVals);
  const ySpan = (yMax - yMin) || 1;
  yMin -= ySpan * 0.1; yMax += ySpan * 0.1;
  const sx = g => margin.left + (maxGames > 1 ? (g - 1) / (maxGames - 1) : 0.5) * plotW;
  const sy = v => margin.top + plotH - (v - yMin) / (yMax - yMin) * plotH;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">`;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + (yMax - yMin) * i / yTicks;
    const y = sy(v);
    svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="gridline"/>`;
    svg += `<text x="${margin.left - 8}" y="${y + 4}" class="axis-label" text-anchor="end">${yFmt(v)}</text>`;
  }
  for (let g = 1; g <= maxGames; g++) {
    svg += `<text x="${sx(g)}" y="${height - margin.bottom + 20}" class="axis-label" text-anchor="middle">${g}</text>`;
  }
  if (yMin < 0 && yMax > 0) svg += `<line x1="${margin.left}" y1="${sy(0)}" x2="${width - margin.right}" y2="${sy(0)}" class="axis-line"/>`;
  svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" class="axis-line"/>`;
  svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" class="axis-line"/>`;

  seriesByTeam.forEach(({ code, series }) => {
    if (!series.length) return;
    const color = cssVar(code);
    const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.gameNum).toFixed(1)},${sy(p[valueKey]).toFixed(1)}`).join(' ');
    svg += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    series.forEach(p => {
      const tip = escapeAttr(`${TEAM_NAME[code]} — Game ${p.gameNum} (${p.home ? 'vs' : '@'} ${p.opponent}): ${p.win ? 'W' : 'L'} ${p.runsFor}-${p.runsAgainst}, ${tipFmt(p)}`);
      svg += `<circle class="trend-pt" cx="${sx(p.gameNum).toFixed(1)}" cy="${sy(p[valueKey]).toFixed(1)}" r="4.5" fill="${color}" stroke="var(--surface-1)" stroke-width="1.5" data-tip="${tip}"/>`;
    });
    const last = series[series.length - 1];
    svg += `<text x="${sx(last.gameNum) + 8}" y="${sy(last[valueKey]) + 4}" class="trend-team-label" fill="${color}">${code}</text>`;
  });

  svg += `<text x="${margin.left + plotW / 2}" y="${height - 4}" class="axis-title" text-anchor="middle">Game #</text>`;
  svg += `<text x="14" y="${margin.top + plotH / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${margin.top + plotH / 2})">${yLabel}</text>`;
  svg += `</svg>`;
  return svg;
}
const winPctTrendSVG = multiLineSVG({ valueKey: 'cumWinPct', yLabel: 'Cumulative Win %', yFmt: v => v.toFixed(3).replace(/^0\./, '.'), tipFmt: p => `${p.record}, ${(p.cumWinPct*100).toFixed(1)}% cum.` });
const runDiffTrendSVG = multiLineSVG({ valueKey: 'cumRunDiff', yLabel: 'Cumulative Run Diff', yFmt: v => (v>0?'+':'')+v.toFixed(0), tipFmt: p => `run diff ${p.cumRunDiff>0?'+':''}${p.cumRunDiff} cum.` });

function streakBadge(streak) {
  if (!streak) return '';
  return `<span class="streak-badge ${streak.type === 'W' ? 'streak-w' : 'streak-l'}">${streak.type}${streak.count}</span>`;
}

const teamCardsHtml = d.teams.map(t => `
      <div class="team-card">
        <div class="bar" style="background:${cssVar(t.code)}"></div>
        <div class="head">
          <div class="city" style="color:${cssVar(t.code)}">${t.name}</div>
          <div class="rec">${t.W}–${t.L}</div>
          <div class="place">${placeLabel(t, d.teams)} place · ${t.pct.toFixed(3).replace(/^0\./,'.')} ${streakBadge(t.streak)}</div>
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

const h2hHtml = `
    <table class="h2h-table">
      <thead><tr><th></th>${d.teamCodes.map(c => `<th style="color:${cssVar(c)}">${c}</th>`).join('')}</tr></thead>
      <tbody>${d.teamCodes.map(rowCode => `
        <tr><th style="color:${cssVar(rowCode)}">${rowCode}</th>${d.teamCodes.map(colCode => {
          if (rowCode === colCode) return '<td class="h2h-self">—</td>';
          const rec = d.headToHead[rowCode][colCode];
          return `<td>${rec.w}-${rec.l}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
    </table>`;

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
svg text.axis-label { font-size: 9px; fill: var(--text-muted); font-family: system-ui, sans-serif; }
svg text.axis-title { font-size: 10.5px; fill: var(--text-secondary); font-family: system-ui, sans-serif; font-weight: 600; }
svg line.gridline { stroke: var(--grid); stroke-width: 1; }
svg line.axis-line { stroke: var(--baseline); stroke-width: 1; }
svg circle.trend-pt { cursor: pointer; }
svg text.trend-team-label { font-size: 10px; font-weight: 700; font-family: system-ui, sans-serif; }
.trend-credit { font-size: 11px; color: var(--text-muted); margin: -6px 0 18px; }
.trend-credit a { color: var(--text-secondary); }
.streak-badge { display: inline-block; font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 10px; letter-spacing: 0.02em; }
.streak-badge.streak-w { background: rgba(12,163,12,0.12); color: var(--good); }
.streak-badge.streak-l { background: rgba(208,59,59,0.12); color: var(--bad); }
table.h2h-table { border-collapse: collapse; font-size: 12.5px; }
table.h2h-table th, table.h2h-table td { padding: 8px 14px; text-align: center; border-bottom: 1px solid var(--grid); }
table.h2h-table thead th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; border-bottom: 1px solid var(--baseline); }
table.h2h-table tbody th { text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; }
table.h2h-table td { font-variant-numeric: tabular-nums; color: var(--text-primary); }
table.h2h-table td.h2h-self { color: var(--text-muted); }
table.h2h-table tbody tr:last-child th, table.h2h-table tbody tr:last-child td { border-bottom: none; }
.ana-tooltip { position: fixed; pointer-events: none; background: var(--text-primary); color: var(--surface-1); font-size: 12px; padding: 6px 9px; border-radius: 6px; opacity: 0; transition: opacity 0.1s; white-space: nowrap; z-index: 1000; }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 32px 0 12px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--grid); }
.disclaimer-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); text-align: center; line-height: 1.6; }
.disclaimer-footer a { color: var(--text-secondary); }
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
    <div class="section-title">Season Trend</div>
    ${d.retroGamesTotal > 0 ? `
    <div class="two-col">
      <div class="card">
        <h2>Cumulative Win %</h2>
        <p class="sub">By game number, all teams on the same axis</p>
        ${winPctTrendSVG}
      </div>
      <div class="card">
        <h2>Cumulative Run Differential</h2>
        <p class="sub">By game number</p>
        ${runDiffTrendSVG}
      </div>
    </div>
    <p class="trend-credit">Game-by-game data from <a href="https://github.com/exu6jh/RetroWPBL" target="_blank" rel="noopener">RetroWPBL</a>, a community Retrosheet-style log by u/revuetext, hand-checked against broadcasts.${d.seasonTrendInSync ? '' : ` It's tracking ${d.retroGamesTotal} of ${d.officialGamesTotal} games played league-wide so far — the trend charts may run a game or so behind the official standings above.`}</p>
    <div class="card">
      <h2>Head-to-Head</h2>
      <p class="sub">Row team's record against column team, from RetroWPBL's game log</p>
      ${h2hHtml}
    </div>
    ` : `<p class="sub">Season-trend data isn't available right now (RetroWPBL fetch failed or has no games yet).</p>`}
    <label class="toggle-row"><input type="checkbox" id="statsUnsignedToggle" checked> Include drafted (not yet signed) players</label>
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
    <footer class="disclaimer-footer">Unofficial fan project — not affiliated with, endorsed by, or sponsored by the Women's Pro Baseball League. Stats and player data sourced from <a href="https://www.womensprobaseballleague.com" target="_blank" rel="noopener">womensprobaseballleague.com</a>. Built with <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude</a>.</footer>
  </div>
  <div class="ana-tooltip" id="trendTooltip"></div>
</div>
<script>
(function(){
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

const toggle = document.getElementById('statsUnsignedToggle');

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

var trendTip = document.getElementById('trendTooltip');
document.querySelectorAll('circle.trend-pt').forEach(function(c){
  c.addEventListener('mousemove', function(e){
    trendTip.textContent = c.dataset.tip;
    trendTip.style.left = (e.clientX + 14) + 'px';
    trendTip.style.top = (e.clientY + 10) + 'px';
    trendTip.style.opacity = '1';
  });
  c.addEventListener('mouseleave', function(){ trendTip.style.opacity = '0'; });
});
})();
</script>
`;

fs.writeFileSync('./output/wpbl_stats.html', html);
console.log('Wrote wpbl_stats.html');
