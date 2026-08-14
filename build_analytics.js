const fs = require('fs');
const raw = require('./output/result.json');
const data = { ...raw, players: raw.pcaPlayers };
const pcaPlayersJson = JSON.stringify(raw.pcaPlayers.map(p => ({ name: p.name, pc1: p.pc1, status: p.status })));

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_NAME = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };

// Sample-size language is computed from actual games played, not hardcoded, so it
// doesn't silently go stale as the season progresses.
const gamesPlayedList = data.teams.map(t => t.G);
const minGamesPlayed = Math.min(...gamesPlayedList), maxGamesPlayed = Math.max(...gamesPlayedList);
const gamesPlayedPhrase = minGamesPlayed === maxGamesPlayed
  ? `${minGamesPlayed} game${minGamesPlayed === 1 ? '' : 's'}`
  : `${minGamesPlayed}-${maxGamesPlayed} games`;

function domain(vals, padFrac=0.12) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  return [min - span*padFrac, max + span*padFrac];
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// items: [{label, weight}] — PCA loadings rendered as diverging bars, sorted by |value|.
function loadingsBars(items) {
  const valueOf = it => it.weight !== undefined ? it.weight : it.r;
  const maxAbs = Math.max(...items.map(it => Math.abs(valueOf(it))), 1e-9);
  const sorted = [...items].sort((a,b) => Math.abs(valueOf(b)) - Math.abs(valueOf(a)));
  const rows = sorted.map(it => {
    const v = valueOf(it);
    const pct = (Math.abs(v) / maxAbs * 50).toFixed(2);
    const isPos = v >= 0;
    const left = isPos ? '50%' : `${(50 - pct).toFixed(2)}%`;
    const color = isPos ? 'var(--load-pos)' : 'var(--load-neg)';
    return `<div class="loadings-row">
      <span class="lbl">${it.label}</span>
      <span class="loadings-track"><span class="loadings-center"></span><span class="loadings-fill" style="left:${left}; width:${pct}%; background:${color};"></span></span>
      <span class="val">${v>=0?'+':''}${v.toFixed(3)}</span>
    </div>`;
  }).join('');
  return `<div class="loadings-wrap">${rows}</div>`;
}

function topSentence(items, n=3) {
  const valueOf = it => it.weight !== undefined ? it.weight : it.r;
  const sorted = [...items].sort((a,b) => Math.abs(valueOf(b)) - Math.abs(valueOf(a))).slice(0, n);
  return sorted.map(it => `${it.label} (${valueOf(it)>=0?'+':''}${valueOf(it).toFixed(2)})`).join(', ');
}

function contrastSentence(items) {
  const valueOf = it => it.weight !== undefined ? it.weight : it.r;
  const sorted = [...items].sort((a,b) => valueOf(b) - valueOf(a));
  const top = sorted[0], bottom = sorted[sorted.length-1];
  return `${top.label} (${valueOf(top)>=0?'+':''}${valueOf(top).toFixed(2)}) vs. ${bottom.label} (${valueOf(bottom).toFixed(2)})`;
}

function scatterSVG({ points, xKey, yKey, xLabel, yLabel, width=520, height=360, trend=null, xTicks=5, yTicks=5, xFmt=v=>v.toFixed(0), yFmt=v=>v.toFixed(2) }) {
  const margin = { top: 16, right: 20, bottom: 44, left: 56 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const xs = points.map(p => p[xKey]);
  const ys = points.map(p => p[yKey]);
  const [xMin, xMax] = domain(xs);
  const [yMin, yMax] = domain(ys);
  const sx = v => margin.left + (v - xMin) / (xMax - xMin) * plotW;
  const sy = v => margin.top + plotH - (v - yMin) / (yMax - yMin) * plotH;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">`;
  // gridlines
  for (let i=0;i<=yTicks;i++){
    const v = yMin + (yMax-yMin)*i/yTicks;
    const y = sy(v);
    svg += `<line x1="${margin.left}" y1="${y}" x2="${width-margin.right}" y2="${y}" class="gridline"/>`;
    svg += `<text x="${margin.left-8}" y="${y+4}" class="axis-label" text-anchor="end">${yFmt(v)}</text>`;
  }
  for (let i=0;i<=xTicks;i++){
    const v = xMin + (xMax-xMin)*i/xTicks;
    const x = sx(v);
    svg += `<text x="${x}" y="${height-margin.bottom+20}" class="axis-label" text-anchor="middle">${xFmt(v)}</text>`;
  }
  // axis lines
  svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height-margin.bottom}" class="axis-line"/>`;
  svg += `<line x1="${margin.left}" y1="${height-margin.bottom}" x2="${width-margin.right}" y2="${height-margin.bottom}" class="axis-line"/>`;
  // trend line
  if (trend) {
    const x1 = xMin, x2 = xMax;
    const y1 = trend.slope*x1 + trend.intercept;
    const y2 = trend.slope*x2 + trend.intercept;
    svg += `<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" class="trend-line"/>`;
  }
  // points
  points.forEach(p => {
    const cx = sx(p[xKey]), cy = sy(p[yKey]);
    const color = TEAM_COLOR[p.team] || '#888';
    const draft = p.draftRound != null ? ` — Round ${p.draftRound}, Pick ${p.draftPick} overall` : '';
    const linkHint = p.url ? ' — click to view profile' : '';
    const tip = escapeAttr(`${p.name} (${TEAM_NAME[p.team]}) — ${xLabel}: ${xFmt(p[xKey])}, ${yLabel}: ${yFmt(p[yKey])}${draft}${linkHint}`);
    const statusAttr = p.status ? ` data-status="${escapeAttr(p.status)}"` : '';
    const urlAttr = p.url ? ` data-url="${escapeAttr(p.url)}"` : '';
    svg += `<circle class="pt-ana" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" fill="${color}" fill-opacity="0.85" stroke="var(--surface-1)" stroke-width="1.5" data-tip="${tip}"${statusAttr}${urlAttr}/>`;
  });
  // axis titles
  svg += `<text x="${margin.left + plotW/2}" y="${height-6}" class="axis-title" text-anchor="middle">${xLabel}</text>`;
  svg += `<text x="14" y="${margin.top + plotH/2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${margin.top + plotH/2})">${yLabel}</text>`;
  svg += `</svg>`;
  return svg;
}

// ---- Build PCA scatter ----
const pcaSVG = scatterSVG({
  points: data.players, xKey: 'pc1', yKey: 'pc2',
  xLabel: `PC1 (${(data.pca_explained[0]*100).toFixed(1)}%)`, yLabel: `PC2 (${(data.pca_explained[1]*100).toFixed(1)}%)`,
  xFmt: v=>v.toFixed(1), yFmt: v=>v.toFixed(1),
});

const html = `<title>WPBL 2026 At-Bat Analytics</title>
<style>
.viz-root {
  color-scheme: light;
  --surface-0: #f5f4f0; --surface-1: #ffffff; --surface-2: #f0efe9;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --la: ${TEAM_COLOR.LA}; --ny: ${TEAM_COLOR.NY}; --sf: ${TEAM_COLOR.SF}; --bos: ${TEAM_COLOR.BOS};
  --load-pos: #1d4fd6; --load-neg: #c2410c;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text-primary); background: var(--surface-0);
  padding: 28px 20px 56px; box-sizing: border-box;
}
.viz-root * { box-sizing: border-box; }
.wrap { max-width: 1140px; margin: 0 auto; }
header.page-head { margin-bottom: 24px; }
header.page-head .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
header.page-head h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
header.page-head p { margin: 0; color: var(--text-secondary); font-size: 13.5px; max-width: 820px; }
header.page-head .cite { color: var(--text-muted); font-size: 11.5px; margin-top: 8px; }
.caveat { background: var(--surface-1); border: 1px solid var(--border); border-left: 3px solid var(--bos); border-radius: 8px; padding: 12px 16px; margin: 18px 0 26px; font-size: 12.5px; color: var(--text-secondary); }
.caveat b { color: var(--text-primary); }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 32px 0 12px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ""; flex: 1; height: 1px; background: var(--grid); }
.legend-row { display: flex; gap: 18px; flex-wrap: wrap; margin: 16px 0 4px; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600; }
.legend-row span { display: inline-flex; align-items: center; gap: 6px; }
.legend-row i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; }
.card h2 { font-size: 14px; margin: 0 0 4px; font-weight: 700; }
.card .sub { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; }
svg text.axis-label { font-size: 9px; fill: var(--text-muted); font-family: system-ui, sans-serif; }
svg text.axis-title { font-size: 10.5px; fill: var(--text-secondary); font-family: system-ui, sans-serif; font-weight: 600; }
svg line.gridline { stroke: var(--grid); stroke-width: 1; }
svg line.axis-line { stroke: var(--baseline); stroke-width: 1; }
svg line.trend-line { stroke: var(--text-secondary); stroke-width: 2; stroke-dasharray: 5 4; }
svg circle.pt-ana { cursor: pointer; }
.pca-note { font-size: 11.5px; color: var(--text-muted); margin-top: 8px; }
.ana-tooltip { position: fixed; pointer-events: none; background: var(--text-primary); color: var(--surface-1); font-size: 12px; padding: 6px 9px; border-radius: 6px; opacity: 0; transition: opacity 0.1s; white-space: nowrap; z-index: 1000; }
.loadings-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 14px 0 6px; }
.loadings-wrap { display: flex; flex-direction: column; gap: 3px; }
.loadings-row { display: grid; grid-template-columns: 56px 1fr 48px; align-items: center; gap: 8px; }
.loadings-row .lbl { font-size: 11px; font-weight: 600; color: var(--text-primary); text-align: right; }
.loadings-row .val { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--text-muted); }
.loadings-track { position: relative; height: 11px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
.loadings-center { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--baseline); z-index: 1; }
.loadings-fill { position: absolute; top: 1px; bottom: 1px; border-radius: 2px; }
.loadings-legend { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.loadings-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.toggle-row { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin: 4px 0 4px; cursor: pointer; width: fit-content; }
.disclaimer-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); text-align: center; line-height: 1.6; }
.disclaimer-footer a { color: var(--text-secondary); }
@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <div class="kicker">2026 Regular Season</div>
      <h1>WPBL At-Bat Performance Analytics</h1>
      <p>PCA over each batter's at-bat rate-stat profile (AVG/OBP/SLG and contact outcomes) — pitching, fielding, and base-running are not part of this model. For age/stat correlations across any two metrics, including pitching ones, use the Stat Explorer tab.</p>
      <p class="cite">Source: womensprobaseballleague.com/stats &amp; /prospect-ranking — through ${new Date(data.scrapedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })} · auto-updated daily</p>
    </header>

    <div class="caveat"><b>Sample-size warning:</b> teams have played ${gamesPlayedPhrase} so far this season, and most batters have only a handful of plate appearances — the PCA below is still an early-season snapshot, not a predictive signal. Note: this includes anyone who's recorded a plate appearance, regardless of the site's "Signed" status — that flag has lagged actual game participation for at least one player.</div>

    <div class="legend-row">
      <span><i style="background:var(--la)"></i>Los Angeles</span>
      <span><i style="background:var(--ny)"></i>New York</span>
      <span><i style="background:var(--sf)"></i>San Francisco</span>
      <span><i style="background:var(--bos)"></i>Boston</span>
    </div>

    <label class="toggle-row"><input type="checkbox" id="anaUnsignedToggle" checked> Include drafted (not yet signed) players</label>

    <div class="section-title">Dimensionality Reduction — At-Bat Rate-Stat Profiles (Batting Only)</div>
    <p style="color:var(--text-secondary); font-size:12.5px; margin:-6px 0 14px;">Each of <span id="playerCount">${data.players.length}</span> batters is represented as a 10-dimensional vector of at-bat outcomes (AVG, OBP, SLG, and R/H/HR/RBI/BB/SO/SB per plate appearance), standardized, then projected to 2D via PCA — a linear method whose axis loadings are directly interpretable, unlike nonlinear embeddings (t-SNE, UMAP), which we skip here since a handful of games per player isn't enough signal for them to say anything beyond "got a hit or didn't." Pitching, fielding, and base-running stats aren't included in this vector.</p>
    <div class="card">
      <h2>PCA</h2>
      <p class="sub">Principal component analysis — linear projection</p>
      <div style="max-width:640px;">${pcaSVG}</div>
      <p class="pca-note">PC1 explains ${(data.pca_explained[0]*100).toFixed(1)}% of variance, PC2 explains ${(data.pca_explained[1]*100).toFixed(1)}% (${((data.pca_explained[0]+data.pca_explained[1])*100).toFixed(1)}% combined). PC1 reads almost entirely as "produced offense in a tiny sample" — <span id="pc1Leaders">${[...data.players].sort((a,b)=>b.pc1-a.pc1).slice(0,2).map(p=>p.name).join(' and ')}</span> anchor the right edge; hitless players cluster left.</p>
      <div class="grid2">
        <div>
          <div class="loadings-title">PC1 loadings — driven by ${topSentence(data.clusterLoadings.pca.pc1)}</div>
          ${loadingsBars(data.clusterLoadings.pca.pc1)}
        </div>
        <div>
          <div class="loadings-title">PC2 loadings — contrasts ${contrastSentence(data.clusterLoadings.pca.pc2)}</div>
          ${loadingsBars(data.clusterLoadings.pca.pc2)}
        </div>
      </div>
      <p class="loadings-legend"><i style="background:var(--load-pos)"></i>positive weight &nbsp; <i style="background:var(--load-neg)"></i>negative weight — each bar is that stat's contribution to the component, in standardized units. Loadings are fit on the full population and don't change with the toggle above.</p>
    </div>

    <footer class="disclaimer-footer">Unofficial fan project — not affiliated with, endorsed by, or sponsored by the Women's Pro Baseball League. Stats and player data sourced from <a href="https://www.womensprobaseballleague.com" target="_blank" rel="noopener">womensprobaseballleague.com</a>. Built with <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude</a>.</footer>
  </div>
  <div class="ana-tooltip" id="anaTooltip"></div>
</div>
<script>
(function(){
  var PCA_PLAYERS = ${pcaPlayersJson};
  var tip = document.getElementById('anaTooltip');
  var toggle = document.getElementById('anaUnsignedToggle');
  var countEl = document.getElementById('playerCount');
  var leadersEl = document.getElementById('pc1Leaders');
  var circles = document.querySelectorAll('circle.pt-ana');

  circles.forEach(function(c){
    c.addEventListener('mousemove', function(e){
      tip.textContent = c.dataset.tip;
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY + 10) + 'px';
      tip.style.opacity = '1';
    });
    c.addEventListener('mouseleave', function(){ tip.style.opacity = '0'; });
    c.addEventListener('click', function(){
      if (c.dataset.url) window.open(c.dataset.url, '_blank', 'noopener');
    });
  });

  function applyToggle(){
    var includeUnsigned = toggle.checked;
    circles.forEach(function(c){
      var visible = includeUnsigned || c.dataset.status === 'Signed';
      c.style.display = visible ? '' : 'none';
    });
    var visiblePlayers = PCA_PLAYERS.filter(function(p){ return includeUnsigned || p.status === 'Signed'; });
    countEl.textContent = visiblePlayers.length;
    var top2 = [...visiblePlayers].sort(function(a,b){ return b.pc1 - a.pc1; }).slice(0,2).map(function(p){ return p.name; });
    leadersEl.textContent = top2.join(' and ');
  }
  toggle.addEventListener('change', applyToggle);
  applyToggle();
})();
</script>
`;

fs.writeFileSync('./output/wpbl_analytics.html', html);
console.log('Wrote wpbl_analytics.html');
