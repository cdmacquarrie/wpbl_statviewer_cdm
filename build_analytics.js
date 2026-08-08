const fs = require('fs');
const raw = require('./output/result.json');
const data = { ...raw, players: raw.pcaPlayers };

const TEAM_COLOR = { LA: '#ab7d2e', NY: '#1d4fd6', SF: '#a020a0', BOS: '#1f7a45' };
const TEAM_NAME = { LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco', BOS: 'Boston' };

function domain(vals, padFrac=0.12) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  return [min - span*padFrac, max + span*padFrac];
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
    svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" fill="${color}" fill-opacity="0.85" stroke="var(--surface-1)" stroke-width="1.5"><title>${p.name} (${TEAM_NAME[p.team]}) — ${xLabel}: ${xFmt(p[xKey])}, ${yLabel}: ${yFmt(p[yKey])}</title></circle>`;
  });
  // axis titles
  svg += `<text x="${margin.left + plotW/2}" y="${height-6}" class="axis-title" text-anchor="middle">${xLabel}</text>`;
  svg += `<text x="14" y="${margin.top + plotH/2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${margin.top + plotH/2})">${yLabel}</text>`;
  svg += `</svg>`;
  return svg;
}

function rBadge(r, n) {
  const abs = Math.abs(r);
  let strength = 'negligible';
  if (abs >= 0.5) strength = 'strong';
  else if (abs >= 0.3) strength = 'moderate';
  else if (abs >= 0.1) strength = 'weak';
  return `<span class="r-badge">r = ${r.toFixed(3)}</span><span class="n-badge">n = ${n}</span><span class="strength-badge">${strength}</span>`;
}

// ---- Build correlation charts ----
// The leaderboard arrays include players with no bio match (unsigned but played);
// age-keyed charts need that subset filtered out or xFmt(null) throws.
const ageQualBatters = data.qualBatters.filter(p => p.age != null);
const ageSbBatters = data.sbCorrelationPoints.filter(p => p.age != null);
const ageQualPitchers = data.qualPitchers.filter(p => p.age != null);

const ageAvgSVG = scatterSVG({
  points: ageQualBatters, xKey: 'age', yKey: 'AVG',
  xLabel: 'Age', yLabel: 'Batting Average',
  trend: data.correlations.age_avg,
  xFmt: v=>v.toFixed(0), yFmt: v=>v.toFixed(3),
});
const ageOpsSVG = scatterSVG({
  points: ageQualBatters, xKey: 'age', yKey: 'OPS',
  xLabel: 'Age', yLabel: 'OPS',
  trend: data.correlations.age_ops,
  xFmt: v=>v.toFixed(0), yFmt: v=>v.toFixed(2),
});
const ageSbSVG = scatterSVG({
  points: ageSbBatters, xKey: 'age', yKey: 'SB',
  xLabel: 'Age', yLabel: 'Stolen Bases',
  trend: data.correlations.age_sb,
  xFmt: v=>v.toFixed(0), yFmt: v=>v.toFixed(1),
});
const ageEraSVG = scatterSVG({
  points: ageQualPitchers, xKey: 'age', yKey: 'ERA',
  xLabel: 'Age', yLabel: 'ERA',
  trend: data.correlations.age_era,
  xFmt: v=>v.toFixed(0), yFmt: v=>v.toFixed(1),
});

// ---- Build PCA / tSNE / UMAP scatters ----
const pcaSVG = scatterSVG({
  points: data.players, xKey: 'pc1', yKey: 'pc2',
  xLabel: `PC1 (${(data.pca_explained[0]*100).toFixed(1)}%)`, yLabel: `PC2 (${(data.pca_explained[1]*100).toFixed(1)}%)`,
  xFmt: v=>v.toFixed(1), yFmt: v=>v.toFixed(1),
});
const tsneSVG = scatterSVG({
  points: data.players, xKey: 'tsneX', yKey: 'tsneY',
  xLabel: 't-SNE dim 1', yLabel: 't-SNE dim 2',
  xFmt: v=>v.toFixed(2), yFmt: v=>v.toFixed(2),
});
const umapSVG = scatterSVG({
  points: data.players, xKey: 'umapX', yKey: 'umapY',
  xLabel: 'UMAP dim 1', yLabel: 'UMAP dim 2',
  xFmt: v=>v.toFixed(1), yFmt: v=>v.toFixed(1),
});

const c = data.correlations;

const html = `<title>WPBL 2026 Analytics</title>
<style>
.viz-root {
  color-scheme: light;
  --surface-0: #f5f4f0; --surface-1: #ffffff; --surface-2: #f0efe9;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --la: ${TEAM_COLOR.LA}; --ny: ${TEAM_COLOR.NY}; --sf: ${TEAM_COLOR.SF}; --bos: ${TEAM_COLOR.BOS};
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
.badges { margin-bottom: 8px; }
.r-badge { font-family: ui-monospace, monospace; font-size: 12.5px; font-weight: 700; color: var(--text-primary); background: var(--surface-2); padding: 3px 8px; border-radius: 5px; margin-right: 6px; }
.n-badge, .strength-badge { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; margin-right: 10px; }
.strength-badge { color: var(--text-secondary); font-weight: 600; }
svg text.axis-label { font-size: 9px; fill: var(--text-muted); font-family: system-ui, sans-serif; }
svg text.axis-title { font-size: 10.5px; fill: var(--text-secondary); font-family: system-ui, sans-serif; font-weight: 600; }
svg line.gridline { stroke: var(--grid); stroke-width: 1; }
svg line.axis-line { stroke: var(--baseline); stroke-width: 1; }
svg line.trend-line { stroke: var(--text-secondary); stroke-width: 2; stroke-dasharray: 5 4; }
.pca-note { font-size: 11.5px; color: var(--text-muted); margin-top: 8px; }
@media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
</style>
<div class="viz-root">
  <div class="wrap">
    <header class="page-head">
      <div class="kicker">2026 Regular Season</div>
      <h1>WPBL Bio × Performance Analytics</h1>
      <p>Correlating player biographical data (age) against on-field stats, plus dimensionality reduction (PCA, t-SNE, UMAP) over each batter's rate-stat profile.</p>
      <p class="cite">Source: womensprobaseballleague.com/stats &amp; /prospect-ranking — through ${new Date(data.scrapedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · auto-updated daily</p>
    </header>

    <div class="caveat"><b>Sample-size warning:</b> every team has played only 2 games. Qualified-batter correlations run on 16–47 players with 1–9 plate appearances each, and PCA/t-SNE/UMAP cluster on essentially one game's worth of rate stats per player. Treat every pattern below as descriptive of these four opening games, not a predictive signal.</div>

    <div class="legend-row">
      <span><i style="background:var(--la)"></i>Los Angeles</span>
      <span><i style="background:var(--ny)"></i>New York</span>
      <span><i style="background:var(--sf)"></i>San Francisco</span>
      <span><i style="background:var(--bos)"></i>Boston</span>
    </div>

    <div class="section-title">Age vs. Performance — Correlation Dot Plots</div>
    <div class="grid2">
      <div class="card">
        <h2>Age vs. Batting Average</h2>
        <p class="sub">Qualified batters (5+ AB)</p>
        <div class="badges">${rBadge(c.age_avg.r, c.age_avg.n)}</div>
        ${ageAvgSVG}
      </div>
      <div class="card">
        <h2>Age vs. OPS</h2>
        <p class="sub">Qualified batters (5+ AB)</p>
        <div class="badges">${rBadge(c.age_ops.r, c.age_ops.n)}</div>
        ${ageOpsSVG}
      </div>
      <div class="card">
        <h2>Age vs. Stolen Bases</h2>
        <p class="sub">All batters with a plate appearance</p>
        <div class="badges">${rBadge(c.age_sb.r, c.age_sb.n)}</div>
        ${ageSbSVG}
      </div>
      <div class="card">
        <h2>Age vs. ERA</h2>
        <p class="sub">Qualified pitchers (2.0+ IP) — lower ERA is better</p>
        <div class="badges">${rBadge(c.age_era.r, c.age_era.n)}</div>
        ${ageEraSVG}
      </div>
    </div>
    <div class="caveat">All four |r| values are below ${(Math.max(...[c.age_avg.r,c.age_ops.r,c.age_sb.r,c.age_era.r].map(Math.abs)) + 0.005).toFixed(2)} — essentially no linear relationship between a player's age and her early performance in this dataset. That's expected: 2 games is far too small a sample for age-related trends (which normally emerge over hundreds of PAs) to surface, and could easily be pure noise.</div>

    <div class="section-title">Dimensionality Reduction — Batter Rate-Stat Profiles</div>
    <p style="color:var(--text-secondary); font-size:12.5px; margin:-6px 0 14px;">Each of the ${data.players.length} batters is represented as a 10-dimensional vector (AVG, OBP, SLG, and R/H/HR/RBI/BB/SO/SB per plate appearance), standardized, then projected to 2D three ways. Points are colored by team.</p>
    <div class="grid2">
      <div class="card">
        <h2>PCA</h2>
        <p class="sub">Principal component analysis — linear projection</p>
        ${pcaSVG}
        <p class="pca-note">PC1 explains ${(data.pca_explained[0]*100).toFixed(1)}% of variance, PC2 explains ${(data.pca_explained[1]*100).toFixed(1)}% (${((data.pca_explained[0]+data.pca_explained[1])*100).toFixed(1)}% combined). PC1 reads almost entirely as "produced offense in a tiny sample" — ${[...data.players].sort((a,b)=>b.pc1-a.pc1).slice(0,2).map(p=>p.name).join(' and ')} anchor the right edge; hitless players cluster left.</p>
      </div>
      <div class="card">
        <h2>t-SNE</h2>
        <p class="sub">Perplexity 8 — local-neighborhood projection</p>
        ${tsneSVG}
      </div>
    </div>
    <div class="card">
      <h2>UMAP</h2>
      <p class="sub">n_neighbors 8, min_dist 0.3</p>
      <div style="max-width:600px;">${umapSVG}</div>
      <p class="pca-note">t-SNE and UMAP both separate the "already got a hit" players from the "hitless through 2 games" players as their dominant axis — with a sample this small, that's essentially the only real signal in the stat line, so all three methods converge on roughly the same split rather than revealing distinct team or role clusters.</p>
    </div>

  </div>
</div>
`;

fs.writeFileSync('./output/wpbl_analytics.html', html);
console.log('Wrote wpbl_analytics.html');
