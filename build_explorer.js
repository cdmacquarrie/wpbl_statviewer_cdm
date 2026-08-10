const fs = require('fs');
const resultData = require('./output/result.json');

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_NAME = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };

const PLAYER_STAT_DEFS = [
  { key: 'age', label: 'Age', group: 'Bio', fmt: 1 },
  { key: 'pos', label: 'Position', group: 'Bio', type: 'categorical' },
  { key: 'bats', label: 'Bats (B arm)', group: 'Bio', type: 'categorical' },
  { key: 'throws', label: 'Throws (T arm)', group: 'Bio', type: 'categorical' },
  { key: 'country', label: 'Home Country', group: 'Bio', type: 'categorical' },
  { key: 'homeState', label: 'Home State/Province', group: 'Bio', type: 'categorical' },
  { key: 'draftRound', label: 'Draft Round', group: 'Bio', fmt: 0 },
  { key: 'draftPick', label: 'Draft Pick (Overall)', group: 'Bio', fmt: 0 },
  { key: 'distanceFromSpringfieldMi', label: 'Distance from Springfield, IL (mi)', group: 'Bio', fmt: 0 },
  { key: 'G', label: 'Games', group: 'Batting', fmt: 0 },
  { key: 'PA', label: 'Plate Appearances', group: 'Batting', fmt: 0 },
  { key: 'AB', label: 'At-Bats', group: 'Batting', fmt: 0 },
  { key: 'R', label: 'Runs', group: 'Batting', fmt: 0 },
  { key: 'H', label: 'Hits', group: 'Batting', fmt: 0 },
  { key: 'HR', label: 'Home Runs', group: 'Batting', fmt: 0 },
  { key: 'RBI', label: 'RBI', group: 'Batting', fmt: 0 },
  { key: 'BB', label: 'Walks', group: 'Batting', fmt: 0 },
  { key: 'SO', label: 'Strikeouts (batting)', group: 'Batting', fmt: 0 },
  { key: 'SB', label: 'Stolen Bases', group: 'Batting', fmt: 0 },
  { key: 'AVG', label: 'Batting Average', group: 'Batting', fmt: 3 },
  { key: 'OBP', label: 'On-Base %', group: 'Batting', fmt: 3 },
  { key: 'SLG', label: 'Slugging %', group: 'Batting', fmt: 3 },
  { key: 'OPS', label: 'OPS', group: 'Batting', fmt: 3 },
  { key: 'IP', label: 'Innings Pitched', group: 'Pitching', fmt: 1 },
  { key: 'ERA', label: 'ERA', group: 'Pitching', fmt: 2 },
  { key: 'WHIP', label: 'WHIP', group: 'Pitching', fmt: 2 },
  { key: 'W', label: 'Wins', group: 'Pitching', fmt: 0 },
  { key: 'L', label: 'Losses', group: 'Pitching', fmt: 0 },
  { key: 'SV', label: 'Saves', group: 'Pitching', fmt: 0 },
  { key: 'K_pitch', label: 'Strikeouts (pitching)', group: 'Pitching', fmt: 0 },
  { key: 'BB_allowed', label: 'Walks Allowed', group: 'Pitching', fmt: 0 },
  { key: 'ER', label: 'Earned Runs', group: 'Pitching', fmt: 0 },
];

const TEAM_STAT_DEFS = [
  { key: 'pct', label: 'Win %', group: 'Record', fmt: 3 },
  { key: 'W', label: 'Wins', group: 'Record', fmt: 0 },
  { key: 'L', label: 'Losses', group: 'Record', fmt: 0 },
  { key: 'runDiff', label: 'Run Differential', group: 'Record', fmt: 0 },
  { key: 'R_per_game', label: 'Runs / Game', group: 'Performance', fmt: 2 },
  { key: 'RA_per_game', label: 'Runs Allowed / Game', group: 'Performance', fmt: 2 },
  { key: 'HR_per_game', label: 'Home Runs / Game', group: 'Performance', fmt: 2 },
  { key: 'AVG', label: 'Team Batting Avg', group: 'Performance', fmt: 3 },
  { key: 'ERA', label: 'Team ERA', group: 'Performance', fmt: 2 },
  { key: 'WHIP', label: 'Team WHIP', group: 'Performance', fmt: 2 },
  { key: 'FPCT', label: 'Fielding %', group: 'Performance', fmt: 3 },
  { key: 'avgAge', label: 'Avg Roster Age', group: 'Roster', fmt: 1 },
  { key: 'pctUSA', label: '% From USA', group: 'Roster', fmt: 1 },
  { key: 'pctLeftBats', label: '% Left-Handed Bats', group: 'Roster', fmt: 1 },
  { key: 'pctLeftThrows', label: '% Left-Handed Throws', group: 'Roster', fmt: 1 },
  { key: 'rosterSize', label: 'Roster Size', group: 'Roster', fmt: 0 },
];

const players = resultData.explorerPlayers;
const teamStats = resultData.teamStats;

// Sample-size language is computed from actual games played, not hardcoded, so it
// doesn't silently go stale as the season progresses.
const gamesPlayedList = teamStats.map(t => t.W + t.L);
const minGamesPlayed = Math.min(...gamesPlayedList), maxGamesPlayed = Math.max(...gamesPlayedList);
const gamesPlayedPhrase = minGamesPlayed === maxGamesPlayed
  ? `${minGamesPlayed} game${minGamesPlayed === 1 ? '' : 's'}`
  : `${minGamesPlayed}-${maxGamesPlayed} games`;

const dataJson = JSON.stringify(players);
const teamStatsJson = JSON.stringify(teamStats);
const playerStatDefsJson = JSON.stringify(PLAYER_STAT_DEFS);
const teamStatDefsJson = JSON.stringify(TEAM_STAT_DEFS);
const teamColorJson = JSON.stringify(TEAM_COLOR);
const teamNameJson = JSON.stringify(TEAM_NAME);

const html = `<title>WPBL 2026 Stat Explorer</title>
<style>
.viz-root {
  color-scheme: light;
  --surface-0: #f5f4f0; --surface-1: #ffffff; --surface-2: #f0efe9;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --accent: #1d4fd6;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text-primary); background: var(--surface-0);
  padding: 28px 20px 56px; box-sizing: border-box;
}
.viz-root * { box-sizing: border-box; }
.wrap { max-width: 900px; margin: 0 auto; }
header.page-head { margin-bottom: 20px; }
header.page-head .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
header.page-head h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
header.page-head p { margin: 0; color: var(--text-secondary); font-size: 13.5px; }
header.page-head .cite { color: var(--text-muted); font-size: 11.5px; margin-top: 8px; }
.caveat { background: var(--surface-1); border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 8px; padding: 12px 16px; margin: 16px 0 20px; font-size: 12.5px; color: var(--text-secondary); }
.controls { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin-bottom: 18px; }
.control-group { display: flex; flex-direction: column; gap: 5px; }
.control-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.control-group select { font-size: 13.5px; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--baseline); background: var(--surface-1); color: var(--text-primary); font-family: inherit; min-width: 190px; }
.control-group.checkbox { flex-direction: row; align-items: center; gap: 7px; }
.control-group.checkbox label { text-transform: none; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.swap-btn { font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 7px; border: 1px solid var(--baseline); background: var(--surface-2); color: var(--text-primary); cursor: pointer; }
.swap-btn:hover { background: var(--grid); }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; margin-bottom: 18px; }
.badges { margin-bottom: 10px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.r-badge { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 700; color: var(--text-primary); background: var(--surface-2); padding: 4px 9px; border-radius: 5px; }
.n-badge, .strength-badge { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
.strength-badge { color: var(--text-secondary); font-weight: 600; }
.legend-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 4px 0 14px; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600; }
.legend-row span { display: inline-flex; align-items: center; gap: 6px; }
.legend-row i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
svg text.axis-label { font-size: 10px; fill: var(--text-muted); font-family: system-ui, sans-serif; }
svg text.axis-title { font-size: 12px; fill: var(--text-secondary); font-family: system-ui, sans-serif; font-weight: 600; }
svg line.gridline { stroke: var(--grid); stroke-width: 1; }
svg line.axis-line { stroke: var(--baseline); stroke-width: 1; }
svg line.trend-line { stroke: var(--text-secondary); stroke-width: 2; stroke-dasharray: 5 4; }
svg circle.pt { cursor: pointer; }
svg rect.bar-track { fill: var(--surface-2); }
svg rect.bar-fill { fill: var(--accent); cursor: pointer; }
svg line.err-bar, svg line.err-cap { stroke: var(--text-primary); stroke-width: 1.5; }
svg text.bar-label { font-size: 11.5px; fill: var(--text-primary); font-family: system-ui, sans-serif; font-weight: 600; }
svg text.bar-value { font-size: 11px; fill: var(--text-secondary); font-family: ui-monospace, monospace; }
.tooltip { position: absolute; pointer-events: none; background: var(--text-primary); color: var(--surface-1); font-size: 12px; padding: 6px 9px; border-radius: 6px; opacity: 0; transition: opacity 0.1s; white-space: nowrap; z-index: 10; }
.empty-msg { text-align: center; color: var(--text-muted); font-size: 13px; padding: 60px 0; }
.disclaimer-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); text-align: center; line-height: 1.6; }
.disclaimer-footer a { color: var(--text-secondary); }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <div class="kicker">2026 Regular Season</div>
      <h1>WPBL Stat Explorer</h1>
      <p>Pick any two stats to plot every player and see the correlation between them, computed live in your browser.</p>
      <p class="cite">Source: womensprobaseballleague.com/stats &amp; /prospect-ranking — through ${new Date(resultData.scrapedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · auto-updated daily</p>
    </header>
    <div class="caveat"><b>Sample-size warning:</b> teams have played ${gamesPlayedPhrase} so far this season. Most players still have single-digit plate appearances or innings pitched, so correlations here reflect early-season data, not a settled trend. Every player with a stat line is included regardless of the site's "Signed" status, since that flag has lagged actual game participation for at least one player.</div>

    <div class="controls">
      <div class="control-group">
        <label for="levelSelect">Level</label>
        <select id="levelSelect">
          <option value="player">Players</option>
          <option value="team">Teams</option>
        </select>
      </div>
      <div class="control-group">
        <label for="xSelect">X axis</label>
        <select id="xSelect"></select>
      </div>
      <button class="swap-btn" id="swapBtn" title="Swap axes">⇄ Swap</button>
      <div class="control-group">
        <label for="ySelect">Y axis</label>
        <select id="ySelect"></select>
      </div>
      <div class="control-group checkbox" id="qualGroup">
        <input type="checkbox" id="qualToggle">
        <label for="qualToggle">Qualified only (5+ AB for batting stats, 2+ IP for pitching stats)</label>
      </div>
      <div class="control-group checkbox" id="expUnsignedGroup">
        <input type="checkbox" id="expUnsignedToggle" checked>
        <label for="expUnsignedToggle">Include drafted (not yet signed) players</label>
      </div>
    </div>

    <div class="legend-row">
      <span><i style="background:${TEAM_COLOR.LA}"></i>Los Angeles</span>
      <span><i style="background:${TEAM_COLOR.NY}"></i>New York</span>
      <span><i style="background:${TEAM_COLOR.SF}"></i>San Francisco</span>
      <span><i style="background:${TEAM_COLOR.BOS}"></i>Boston</span>
    </div>

    <div class="card" style="position:relative;">
      <div class="badges" id="badges"></div>
      <div id="chartHost"></div>
      <div class="tooltip" id="tooltip"></div>
    </div>
    <footer class="disclaimer-footer">Unofficial fan project — not affiliated with, endorsed by, or sponsored by the Women's Pro Baseball League. Stats and player data sourced from <a href="https://www.womensprobaseballleague.com" target="_blank" rel="noopener">womensprobaseballleague.com</a>. Built with <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude</a>.</footer>
  </div>
</div>
<script>
(function(){
const PLAYERS = ${dataJson};
const TEAM_STATS = ${teamStatsJson};
const PLAYER_STAT_DEFS = ${playerStatDefsJson};
const TEAM_STAT_DEFS = ${teamStatDefsJson};
const TEAM_COLOR = ${teamColorJson};
const TEAM_NAME = ${teamNameJson};

const levelSelect = document.getElementById('levelSelect');
const xSelect = document.getElementById('xSelect');
const ySelect = document.getElementById('ySelect');
const qualToggle = document.getElementById('qualToggle');
const qualGroup = document.getElementById('qualGroup');
const expUnsignedToggle = document.getElementById('expUnsignedToggle');
const expUnsignedGroup = document.getElementById('expUnsignedGroup');
const swapBtn = document.getElementById('swapBtn');
const chartHost = document.getElementById('chartHost');
const badgesEl = document.getElementById('badges');
const tooltip = document.getElementById('tooltip');

function currentDefs() { return levelSelect.value === 'team' ? TEAM_STAT_DEFS : PLAYER_STAT_DEFS; }
function currentDataset() { return levelSelect.value === 'team' ? TEAM_STATS : PLAYERS; }

function buildOptions(select, selectedKey) {
  const defs = currentDefs();
  const groups = {};
  defs.forEach(s => { (groups[s.group] = groups[s.group] || []).push(s); });
  select.innerHTML = '';
  Object.entries(groups).forEach(([g, stats]) => {
    const og = document.createElement('optgroup');
    og.label = g;
    stats.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.key; opt.textContent = s.label;
      if (s.key === selectedKey) opt.selected = true;
      og.appendChild(opt);
    });
    select.appendChild(og);
  });
}
buildOptions(xSelect, 'age');
buildOptions(ySelect, 'OPS');

levelSelect.addEventListener('change', () => {
  const isTeam = levelSelect.value === 'team';
  qualGroup.style.display = isTeam ? 'none' : '';
  expUnsignedGroup.style.display = isTeam ? 'none' : '';
  buildOptions(xSelect, isTeam ? 'pctUSA' : 'age');
  buildOptions(ySelect, isTeam ? 'pct' : 'OPS');
  render();
});

function isQualified(p, xDef, yDef) {
  const groups = [xDef.group, yDef.group];
  if (groups.includes('Pitching') && !(p.IP != null && p.IP >= 2)) return false;
  if (groups.includes('Batting') && !(p.AB != null && p.AB >= 5)) return false;
  return true;
}

function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, dx=0, dy=0;
  for (let i=0;i<n;i++){ const a=xs[i]-mx, b=ys[i]-my; num+=a*b; dx+=a*a; dy+=b*b; }
  if (dx===0||dy===0) return 0;
  return num/Math.sqrt(dx*dy);
}
function linreg(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  for (let i=0;i<n;i++){ num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const slope = den===0 ? 0 : num/den;
  return { slope, intercept: my - slope*mx };
}
function domain(vals, padFrac=0.12) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max-min) || 1;
  return [min - span*padFrac, max + span*padFrac];
}
function fmtVal(v, digits) { return v == null ? '—' : v.toFixed(digits); }
function displayVal(p, key, def) { return def.type === 'categorical' ? p[key] : fmtVal(p[key], def.fmt); }

function stdev(vals) {
  const n = vals.length;
  if (n < 2) return 0;
  const mean = vals.reduce((a,b)=>a+b,0) / n;
  return Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2, 0) / (n - 1));
}

// Groups points by a categorical key and summarizes a numeric key per group
// (mean, sample stdev, n) — sorted by mean descending. This is what a
// categorical-vs-numeric axis pair renders as, since a scatter position for
// a category is an arbitrary frequency rank, not a real coordinate, and a
// trend line fit through that arbitrary position is meaningless.
function buildCategoryStats(pts, catKey, numKey) {
  const groups = new Map();
  pts.forEach(p => {
    const cat = p[catKey];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p[numKey]);
  });
  return [...groups.entries()]
    .map(([cat, vals]) => ({ cat, n: vals.length, mean: vals.reduce((a,b)=>a+b,0)/vals.length, sd: stdev(vals) }))
    .sort((a, b) => b.mean - a.mean);
}

// For a categorical axis: map each category to an integer slot (sorted by
// frequency desc, ties alphabetical), then deterministically jitter points
// within their slot (sorted by name) so overlapping players stay visible.
function buildCategoricalAxis(pts, key) {
  const counts = new Map();
  pts.forEach(p => counts.set(p[key], (counts.get(p[key])||0) + 1));
  const categories = [...counts.keys()].sort((a,b) => counts.get(b)-counts.get(a) || String(a).localeCompare(String(b)));
  const catIndex = new Map(categories.map((c,i) => [c, i]));
  const byCat = new Map(categories.map(c => [c, []]));
  [...pts].sort((a,b) => a.name.localeCompare(b.name)).forEach(p => byCat.get(p[key]).push(p));
  const jitterOf = new Map();
  byCat.forEach(group => {
    const n = group.length;
    const step = Math.min(0.09, 0.32 / Math.max(n,1));
    group.forEach((p,i) => jitterOf.set(p, (i - (n-1)/2) * step));
  });
  return {
    isCategorical: true,
    getValue: p => catIndex.get(p[key]) + jitterOf.get(p),
    domainMin: -0.5, domainMax: categories.length - 0.5,
    ticks: categories.map((c,i) => ({ pos: i, label: String(c) })),
  };
}
function buildNumericAxis(pts, key, def) {
  const vals = pts.map(p => p[key]);
  const [min, max] = domain(vals);
  const ticks = [];
  const n = 5;
  for (let i=0;i<=n;i++) { const v = min + (max-min)*i/n; ticks.push({ pos: v, label: fmtVal(v, def.fmt) }); }
  return { isCategorical: false, getValue: p => p[key], domainMin: min, domainMax: max, ticks };
}

function render() {
  const isTeam = levelSelect.value === 'team';
  const defs = currentDefs();
  const map = Object.fromEntries(defs.map(s => [s.key, s]));
  const xKey = xSelect.value, yKey = ySelect.value;
  const xDef = map[xKey], yDef = map[yKey];
  const qualOnly = !isTeam && qualToggle.checked;
  const includeUnsigned = isTeam || expUnsignedToggle.checked;

  let pts = currentDataset().filter(p => p[xKey] != null && p[yKey] != null && p.team);
  if (!includeUnsigned) pts = pts.filter(p => p.status === 'Signed');
  if (qualOnly) pts = pts.filter(p => isQualified(p, xDef, yDef));

  if (pts.length < 2) {
    chartHost.innerHTML = '<div class="empty-msg">Not enough ' + (isTeam ? 'teams' : 'players') + ' have both stats to plot.</div>';
    badgesEl.innerHTML = '';
    return;
  }

  const xCat = xDef.type === 'categorical', yCat = yDef.type === 'categorical';

  if (xCat !== yCat) {
    renderBarChart(pts, xCat ? xKey : yKey, xCat ? yKey : xKey, xCat ? xDef : yDef, xCat ? yDef : xDef, isTeam);
    return;
  }

  const xAxis = xCat ? buildCategoricalAxis(pts, xKey) : buildNumericAxis(pts, xKey, xDef);
  const yAxis = yCat ? buildCategoricalAxis(pts, yKey) : buildNumericAxis(pts, yKey, yDef);

  let trend = null;
  let badgeHtml;
  if (!xCat && !yCat) {
    const xs = pts.map(p => p[xKey]), ys = pts.map(p => p[yKey]);
    const r = pearson(xs, ys);
    trend = linreg(xs, ys);
    const abs = Math.abs(r);
    const strength = abs>=0.5?'strong':abs>=0.3?'moderate':abs>=0.1?'weak':'negligible';
    badgeHtml = \`<span class="r-badge">r = \${r.toFixed(3)}</span><span class="n-badge">n = \${pts.length}</span><span class="strength-badge">\${strength}</span>\`;
  } else {
    badgeHtml = \`<span class="n-badge">n = \${pts.length}</span><span class="strength-badge">both axes categorical — showing co-occurrence, no trend line</span>\`;
  }
  if (isTeam) badgeHtml += \`<span class="n-badge">small sample — 4 teams</span>\`;
  badgesEl.innerHTML = badgeHtml;

  const width = 800, height = 440;
  const margin = { top: 16, right: 24, bottom: xAxis.isCategorical ? 66 : 50, left: yAxis.isCategorical ? 132 : 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const sx = v => margin.left + (v-xAxis.domainMin)/(xAxis.domainMax-xAxis.domainMin)*plotW;
  const sy = v => margin.top + plotH - (v-yAxis.domainMin)/(yAxis.domainMax-yAxis.domainMin)*plotH;

  let svg = \`<svg viewBox="0 0 \${width} \${height}" width="100%" height="\${height}">\`;
  yAxis.ticks.forEach(t => {
    const y = sy(t.pos);
    svg += \`<line x1="\${margin.left}" y1="\${y}" x2="\${width-margin.right}" y2="\${y}" class="gridline"/>\`;
    svg += \`<text x="\${margin.left-8}" y="\${y+4}" class="axis-label" text-anchor="end">\${t.label}</text>\`;
  });
  xAxis.ticks.forEach(t => {
    const x = sx(t.pos);
    svg += \`<text x="\${x}" y="\${height-margin.bottom+20}" class="axis-label" text-anchor="\${xAxis.isCategorical?'end':'middle'}" transform="\${xAxis.isCategorical?\`rotate(-30 \${x} \${height-margin.bottom+20})\`:''}">\${t.label}</text>\`;
  });
  svg += \`<line x1="\${margin.left}" y1="\${margin.top}" x2="\${margin.left}" y2="\${height-margin.bottom}" class="axis-line"/>\`;
  svg += \`<line x1="\${margin.left}" y1="\${height-margin.bottom}" x2="\${width-margin.right}" y2="\${height-margin.bottom}" class="axis-line"/>\`;

  if (trend) {
    const tx1=xAxis.domainMin+((xAxis.domainMax-xAxis.domainMin)*0.02), tx2=xAxis.domainMax-((xAxis.domainMax-xAxis.domainMin)*0.02);
    const ty1=trend.slope*tx1+trend.intercept, ty2=trend.slope*tx2+trend.intercept;
    svg += \`<line x1="\${sx(tx1)}" y1="\${sy(ty1)}" x2="\${sx(tx2)}" y2="\${sy(ty2)}" class="trend-line"/>\`;
  }

  pts.forEach((p,i) => {
    const cx = sx(xAxis.getValue(p)), cy = sy(yAxis.getValue(p));
    const color = TEAM_COLOR[p.team] || '#888';
    svg += \`<circle class="pt" data-i="\${i}" cx="\${cx.toFixed(1)}" cy="\${cy.toFixed(1)}" r="6" fill="\${color}" fill-opacity="0.85" stroke="var(--surface-1)" stroke-width="1.5"/>\`;
  });

  svg += \`<text x="\${margin.left + plotW/2}" y="\${height-6}" class="axis-title" text-anchor="middle">\${xDef.label}</text>\`;
  svg += \`<text x="16" y="\${margin.top + plotH/2}" class="axis-title" text-anchor="middle" transform="rotate(-90 16 \${margin.top + plotH/2})">\${yDef.label}</text>\`;
  svg += \`</svg>\`;
  chartHost.innerHTML = svg;

  chartHost.querySelectorAll('circle.pt').forEach(circle => {
    circle.addEventListener('mousemove', (e) => {
      const p = pts[+circle.dataset.i];
      const who = isTeam ? p.name : \`\${p.name} (\${TEAM_NAME[p.team]})\`;
      const linkHint = !isTeam && p.url ? ' — click to view profile' : '';
      tooltip.textContent = \`\${who} — \${xDef.label}: \${displayVal(p, xKey, xDef)}, \${yDef.label}: \${displayVal(p, yKey, yDef)}\${linkHint}\`;
      tooltip.style.left = (e.offsetX + 14) + 'px';
      tooltip.style.top = (e.offsetY + 8) + 'px';
      tooltip.style.opacity = '1';
    });
    circle.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
    circle.addEventListener('click', () => {
      const p = pts[+circle.dataset.i];
      if (!isTeam && p.url) window.open(p.url, '_blank', 'noopener');
    });
  });
  chartHost.style.position = 'relative';
}

// One categorical + one numeric axis: a scatter position for a category is an
// arbitrary frequency rank, so a trend line through it is meaningless. Show a
// horizontal bar per category instead — mean ± stdev of the numeric stat.
function renderBarChart(pts, catKey, numKey, catDef, numDef, isTeam) {
  const rows = buildCategoryStats(pts, catKey, numKey);
  const badgeHtml = \`<span class="n-badge">n = \${pts.length}</span><span class="strength-badge">\${rows.length} groups — mean \${numDef.label} \\u00b1 1 stdev</span>\`
    + (isTeam ? \`<span class="n-badge">small sample — 4 teams</span>\` : '');
  badgesEl.innerHTML = badgeHtml;

  const rowH = 34, width = 800;
  const margin = { top: 16, right: 70, bottom: 44, left: 160 };
  const plotW = width - margin.left - margin.right;
  const plotH = rows.length * rowH;
  const height = margin.top + plotH + margin.bottom;

  const maxV = Math.max(...rows.map(r => r.mean + r.sd), 1e-9);
  const minV = Math.min(0, ...rows.map(r => r.mean - r.sd));
  const sx = v => margin.left + (v - minV) / (maxV - minV) * plotW;

  let svg = \`<svg viewBox="0 0 \${width} \${height}" width="100%" height="\${height}">\`;
  const xTicks = 5;
  for (let i = 0; i <= xTicks; i++) {
    const v = minV + (maxV-minV)*i/xTicks;
    const x = sx(v);
    svg += \`<line x1="\${x}" y1="\${margin.top}" x2="\${x}" y2="\${margin.top+plotH}" class="gridline"/>\`;
    svg += \`<text x="\${x}" y="\${margin.top+plotH+18}" class="axis-label" text-anchor="middle">\${fmtVal(v, numDef.fmt)}</text>\`;
  }
  svg += \`<line x1="\${margin.left}" y1="\${margin.top}" x2="\${margin.left}" y2="\${margin.top+plotH}" class="axis-line"/>\`;

  rows.forEach((r, i) => {
    const y = margin.top + i*rowH;
    const barY = y + 6, barH = rowH - 14;
    const x0 = sx(0), x1 = sx(r.mean);
    svg += \`<rect class="bar-track" x="\${margin.left}" y="\${barY}" width="\${plotW}" height="\${barH}" rx="3"/>\`;
    svg += \`<rect class="bar-fill" data-i="\${i}" x="\${Math.min(x0,x1)}" y="\${barY}" width="\${Math.abs(x1-x0)}" height="\${barH}" rx="3"/>\`;
    if (r.sd > 0) {
      const ex0 = sx(Math.max(minV, r.mean - r.sd)), ex1 = sx(r.mean + r.sd);
      const midY = barY + barH/2;
      svg += \`<line x1="\${ex0}" y1="\${midY}" x2="\${ex1}" y2="\${midY}" class="err-bar"/>\`;
      svg += \`<line x1="\${ex0}" y1="\${midY-4}" x2="\${ex0}" y2="\${midY+4}" class="err-cap"/>\`;
      svg += \`<line x1="\${ex1}" y1="\${midY-4}" x2="\${ex1}" y2="\${midY+4}" class="err-cap"/>\`;
    }
    svg += \`<text x="\${margin.left-8}" y="\${barY+barH/2+4}" class="bar-label" text-anchor="end">\${r.cat}</text>\`;
    svg += \`<text x="\${width-margin.right+8}" y="\${barY+barH/2+4}" class="bar-value" text-anchor="start">\${fmtVal(r.mean, numDef.fmt)} \\u00b1 \${fmtVal(r.sd, numDef.fmt)}</text>\`;
  });

  svg += \`<text x="\${margin.left + plotW/2}" y="\${height-6}" class="axis-title" text-anchor="middle">\${numDef.label}</text>\`;
  svg += \`</svg>\`;
  chartHost.innerHTML = svg;

  chartHost.querySelectorAll('rect.bar-fill').forEach(rect => {
    rect.addEventListener('mousemove', (e) => {
      const r = rows[+rect.dataset.i];
      tooltip.textContent = \`\${catDef.label}: \${r.cat} — mean \${numDef.label}: \${fmtVal(r.mean, numDef.fmt)} \\u00b1 \${fmtVal(r.sd, numDef.fmt)} (n = \${r.n})\`;
      tooltip.style.left = (e.offsetX + 14) + 'px';
      tooltip.style.top = (e.offsetY + 8) + 'px';
      tooltip.style.opacity = '1';
    });
    rect.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
  });
  chartHost.style.position = 'relative';
}

xSelect.addEventListener('change', render);
ySelect.addEventListener('change', render);
qualToggle.addEventListener('change', render);
expUnsignedToggle.addEventListener('change', render);
swapBtn.addEventListener('click', () => {
  const x = xSelect.value, y = ySelect.value;
  buildOptions(xSelect, y);
  buildOptions(ySelect, x);
  render();
});

render();
})();
</script>
`;

fs.writeFileSync('./output/wpbl_explorer.html', html);
console.log('Wrote wpbl_explorer.html —', players.length, 'players');
