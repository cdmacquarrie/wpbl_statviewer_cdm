const fs = require('fs');
const { PCA } = require('ml-pca');

const raw = JSON.parse(fs.readFileSync('./output/raw_data.json', 'utf8'));
const geocache = fs.existsSync('./hometown_geocache.json')
  ? JSON.parse(fs.readFileSync('./hometown_geocache.json', 'utf8')) : {};
function distanceFromSpringfield(hometown) {
  return hometown && geocache[hometown] ? geocache[hometown].distanceFromSpringfieldMi : null;
}
const TEAM_ABBR = { boston: 'BOS', 'los-angeles': 'LA', 'new-york': 'NY', 'san-francisco': 'SF' };
const TEAM_FULL = { BOS: 'Boston', LA: 'Los Angeles', NY: 'New York', SF: 'San Francisco' };
function slugTeam(name) {
  const s = name.toLowerCase().replace(/\s+/g, '-');
  return TEAM_ABBR[s] || name;
}

// ---- bios: attach age/bats/throws, normalize team to short code ----
// Each round has a fixed 20 picks (verified against every round seen in the
// scraped data — rounds 1-3 all cap at pick 20), so pickOverall recovers the
// true overall draft position from the "Round N * Pick M" text, since pick
// numbers reset to 1 at the start of every round on the site itself.
const ROUND_SIZE = 20;
function parseDraft(sel) {
  if (!sel) return { round: null, pick: null, pickOverall: null };
  const m = sel.match(/Round\s*(\d+).*Pick\s*(\d+)/i);
  if (!m) return { round: null, pick: null, pickOverall: null };
  const round = +m[1], pick = +m[2];
  return { round, pick, pickOverall: (round - 1) * ROUND_SIZE + pick };
}
const bioMap = new Map(raw.bios.map(b => [b.name, {
  age: b.age, pos: b.pos, bats: b.bats, throws: b.throws, hometown: b.hometown,
  team: slugTeam(b.team), status: b.status, url: b.url, ...parseDraft(b.draftSelection),
}]));

// ---- batting / pitching: normalize field names, attach bio ----
function num(v) { return v == null || Number.isNaN(v) ? null : v; }
function parseIPvalue(ip) { if (ip == null) return null; const whole = Math.floor(ip); const frac = Math.round((ip - whole) * 10); return whole + frac / 3; }

const battingRows = raw.battingRaw.map(r => {
  const bio = bioMap.get(r.name) || {};
  return {
    name: r.name, url: r.url, team: r.team, pos: r.pos,
    G: num(r.games_played), PA: num(r.plate_appearances), AB: num(r.at_bats),
    R: num(r.runs), H: num(r.hits), '2B': num(r.doubles), '3B': num(r.triples),
    HR: num(r.home_runs), RBI: num(r.rbi), BB: num(r.walks), SO: num(r.strikeouts),
    SB: num(r.stolen_bases), AVG: num(r.average), OBP: num(r.on_base_percentage),
    SLG: num(r.slugging_percentage), OPS: num(r.ops),
    age: bio.age ?? null, bats: bio.bats ?? null, status: bio.status ?? null,
  };
});

const pitchingRows = raw.pitchingRaw.map(r => {
  const bio = bioMap.get(r.name) || {};
  return {
    name: r.name, url: r.url, team: r.team, pos: r.pos,
    G: num(r.games_played), GS: num(r.games_started), W: num(r.wins), L: num(r.losses),
    ERA: num(r.era), IP: parseIPvalue(num(r.innings_pitched)), H: num(r.hits_allowed),
    R: num(r.runs_allowed), ER: num(r.earned_runs), HR: num(r.home_runs_allowed),
    BB: num(r.walks), SO: num(r.strikeouts), SV: num(r.saves), WHIP: num(r.whip),
    age: bio.age ?? null, status: bio.status ?? null,
  };
});

// ---- team snapshot: standings, per-game, run diff ----
const teamBattingMap = new Map(raw.teamBatting.map(t => [slugTeam(t.team), t]));
const teamPitchingMap = new Map(raw.teamPitching.map(t => [slugTeam(t.team), t]));
const teamFieldingMap = new Map(raw.teamFielding.map(t => [slugTeam(t.team), t]));

const teamCodes = ['LA', 'NY', 'SF', 'BOS'];
const teams = teamCodes.map(code => {
  const bat = teamBattingMap.get(code) || {};
  const pit = teamPitchingMap.get(code) || {};
  const fld = teamFieldingMap.get(code) || {};
  const W = num(pit.wins) ?? 0, L = num(pit.losses) ?? 0;
  const G = W + L;
  const pct = G > 0 ? W / G : 0;
  const runDiff = (num(bat.runs) ?? 0) - (num(pit.runs_allowed) ?? 0);
  return {
    code, name: TEAM_FULL[code],
    W, L, G, pct,
    perGame: {
      R: G > 0 ? bat.runs / G : 0,
      RA: G > 0 ? pit.runs_allowed / G : 0,
      HR: G > 0 ? bat.home_runs / G : 0,
    },
    runDiff,
    AVG: num(bat.average), ERA: num(pit.era), WHIP: num(pit.whip), FPCT: num(fld.fielding_percentage),
  };
}).sort((a, b) => b.pct - a.pct || b.runDiff - a.runDiff);

// gamesBack relative to leader
const leader = teams[0];
teams.forEach(t => {
  t.gb = ((leader.W - t.W) + (t.L - leader.L)) / 2;
});
// place with ties
let place = 1;
teams.forEach((t, i) => {
  if (i > 0 && teams[i-1].pct !== t.pct) place = i + 1;
  t.place = place;
});

// ---- leaderboards ----
const qualBatters = battingRows.filter(r => r.AB >= 5).sort((a,b) => b.AVG - a.AVG);
// dense rank on AVG
let rank = 0, prevAvg = null;
qualBatters.forEach((r, i) => { if (r.AVG !== prevAvg) { rank = i + 1; prevAvg = r.AVG; } r.rank = rank; });

const sbLeaders = battingRows.filter(r => r.PA >= 1 && r.SB > 0).sort((a,b) => b.SB - a.SB);
rank = 0; let prevSb = null;
sbLeaders.forEach((r, i) => { if (r.SB !== prevSb) { rank = i + 1; prevSb = r.SB; } r.rank = rank; });

const qualPitchers = pitchingRows.filter(r => r.IP >= 2).sort((a,b) => a.ERA - b.ERA);
const soLeaders = pitchingRows.filter(r => r.SO > 0).sort((a,b) => b.SO - a.SO);
rank = 0; let prevSo = null;
soLeaders.forEach((r, i) => { if (r.SO !== prevSo) { rank = i + 1; prevSo = r.SO; } r.rank = rank; });

// ---- bios demographics ----
const allBios = raw.bios.map(b => ({ ...b, teamCode: slugTeam(b.team) }));
const ages = allBios.map(b => b.age).filter(a => a != null);
const avgAge = ages.reduce((a,b)=>a+b,0) / ages.length;
const sortedAges = [...ages].sort((a,b)=>a-b);
const medianAge = sortedAges.length % 2 ? sortedAges[(sortedAges.length-1)/2] : (sortedAges[sortedAges.length/2-1]+sortedAges[sortedAges.length/2])/2;

const AGE_BUCKETS = [[18,21],[22,25],[26,29],[30,33],[34,38]];
const ageDist = AGE_BUCKETS.map(([lo,hi]) => ({
  label: `${lo}–${hi}`,
  count: ages.filter(a => a >= lo && a <= hi).length,
}));

function countryOf(hometown) {
  if (!hometown) return 'Unknown';
  const parts = hometown.split(',').map(s => s.trim());
  return parts[parts.length - 1];
}
function stateOf(hometown) {
  if (!hometown) return null;
  const parts = hometown.split(',').map(s => s.trim());
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}
const countryCounts = {};
allBios.forEach(b => { const c = countryOf(b.hometown); countryCounts[c] = (countryCounts[c]||0) + 1; });
const nationality = Object.entries(countryCounts).sort((a,b) => b[1]-a[1]).map(([country,count]) => ({country, count}));

const avgAgeByTeam = teamCodes.map(code => {
  const list = allBios.filter(b => b.teamCode === code && b.age != null);
  const avg = list.reduce((a,b)=>a+b.age,0) / list.length;
  return { team: code, avgAge: avg };
});

function batsThrowsSplit(field) {
  const counts = {};
  allBios.forEach(b => { const v = b[field] || 'Unknown'; counts[v] = (counts[v]||0)+1; });
  return counts;
}
const batsSplit = batsThrowsSplit('bats');
const throwsSplit = batsThrowsSplit('throws');

const rosterByTeam = teamCodes.map(code => ({
  team: code,
  players: allBios.filter(b => b.teamCode === code)
    .sort((a,b) => (b.age||0) - (a.age||0))
    .map(b => ({ name: b.name, age: b.age, pos: b.pos, hometown: b.hometown, bats: b.bats, throws: b.throws, status: b.status, url: b.url, ...parseDraft(b.draftSelection) })),
}));

// ---- team-level roster/bio composition (for team vs. team correlation explorer) ----
const teamStats = teams.map(t => {
  const list = allBios.filter(b => b.teamCode === t.code);
  const withHometown = list.filter(b => b.hometown);
  const usaCount = withHometown.filter(b => countryOf(b.hometown) === 'USA').length;
  const pctUSA = withHometown.length ? usaCount / withHometown.length * 100 : null;
  const ages = list.map(b => b.age).filter(a => a != null);
  const avgAge = ages.length ? ages.reduce((a,b)=>a+b,0) / ages.length : null;
  const pctLeftBats = list.length ? list.filter(b => b.bats === 'L').length / list.length * 100 : null;
  const pctLeftThrows = list.length ? list.filter(b => b.throws === 'L').length / list.length * 100 : null;
  return {
    name: t.name, team: t.code, code: t.code,
    W: t.W, L: t.L, pct: t.pct, gb: t.gb, place: t.place, runDiff: t.runDiff,
    R_per_game: t.perGame.R, RA_per_game: t.perGame.RA, HR_per_game: t.perGame.HR,
    AVG: t.AVG, ERA: t.ERA, WHIP: t.WHIP, FPCT: t.FPCT,
    avgAge, pctUSA, pctLeftBats, pctLeftThrows, rosterSize: list.length,
  };
});

// ---- correlations ----
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, dx=0, dy=0;
  for (let i=0;i<n;i++){ const a=xs[i]-mx, b=ys[i]-my; num+=a*b; dx+=a*a; dy+=b*b; }
  return (dx===0||dy===0) ? 0 : num/Math.sqrt(dx*dy);
}
function linreg(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let numr=0, den=0;
  for (let i=0;i<n;i++){ numr += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const slope = den===0?0:numr/den;
  return { slope, intercept: my - slope*mx };
}
const ageAvgBatters = battingRows.filter(r => r.AB >= 5 && r.age != null);
const ageSbBatters = battingRows.filter(r => r.PA >= 1 && r.age != null);
const ageEraPitchers = pitchingRows.filter(r => r.IP >= 2 && r.age != null);
const correlations = {
  age_avg: { r: pearson(ageAvgBatters.map(x=>x.age), ageAvgBatters.map(x=>x.AVG)), n: ageAvgBatters.length, ...linreg(ageAvgBatters.map(x=>x.age), ageAvgBatters.map(x=>x.AVG)) },
  age_ops: { r: pearson(ageAvgBatters.map(x=>x.age), ageAvgBatters.map(x=>x.OPS)), n: ageAvgBatters.length, ...linreg(ageAvgBatters.map(x=>x.age), ageAvgBatters.map(x=>x.OPS)) },
  age_sb: { r: pearson(ageSbBatters.map(x=>x.age), ageSbBatters.map(x=>x.SB)), n: ageSbBatters.length, ...linreg(ageSbBatters.map(x=>x.age), ageSbBatters.map(x=>x.SB)) },
  age_era: { r: pearson(ageEraPitchers.map(x=>x.age), ageEraPitchers.map(x=>x.ERA)), n: ageEraPitchers.length, ...linreg(ageEraPitchers.map(x=>x.age), ageEraPitchers.map(x=>x.ERA)) },
};

// ---- PCA on batters ----
const FEATURE_LABELS = ['AVG', 'OBP', 'SLG', 'R/PA', 'H/PA', 'HR/PA', 'RBI/PA', 'BB/PA', 'SO/PA', 'SB/PA'];
const feat = battingRows.map(r => {
  const pa = r.PA || 0;
  const safe = v => v == null ? 0 : v;
  return [safe(r.AVG), safe(r.OBP), safe(r.SLG),
    pa>0?r.R/pa:0, pa>0?r.H/pa:0, pa>0?r.HR/pa:0, pa>0?r.RBI/pa:0, pa>0?r.BB/pa:0, pa>0?r.SO/pa:0, pa>0?r.SB/pa:0];
});
function standardize(m) {
  const n = m.length, d = m[0].length;
  const means = new Array(d).fill(0), stds = new Array(d).fill(0);
  for (let j=0;j<d;j++){ let s=0; for (let i=0;i<n;i++) s+=m[i][j]; means[j]=s/n; }
  for (let j=0;j<d;j++){ let s=0; for (let i=0;i<n;i++) s+=(m[i][j]-means[j])**2; stds[j]=Math.sqrt(s/n)||1; }
  return m.map(row => row.map((v,j)=>(v-means[j])/stds[j]));
}
const Z = standardize(feat);
const pca = new PCA(Z);
const pcaProj = pca.predict(Z, {nComponents:2}).to2DArray();
const pcaExplained = pca.getExplainedVariance().slice(0,2);

const pcaPlayers = battingRows.map((r,i) => {
  const bio = bioMap.get(r.name) || {};
  return {
    name: r.name, team: r.team, pos: r.pos,
    pc1: +pcaProj[i][0].toFixed(4), pc2: +pcaProj[i][1].toFixed(4),
    draftRound: bio.round ?? null, draftPick: bio.pickOverall ?? null,
    status: bio.status ?? null, url: r.url ?? null,
  };
});

// ---- PCA loadings: true linear weight of each feature on PC1/PC2 ----
const loadingsMatrix = pca.getLoadings().to2DArray();
const clusterLoadings = {
  pca: {
    pc1: FEATURE_LABELS.map((label, i) => ({ label, weight: +loadingsMatrix[0][i].toFixed(4) })),
    pc2: FEATURE_LABELS.map((label, i) => ({ label, weight: +loadingsMatrix[1][i].toFixed(4) })),
  },
};

// ---- merged per-player dataset for the explorer (batting + pitching + bio) ----
// Union of everyone with a stat line AND everyone in the draft class, so bio-only
// axes (draft pick, position, hometown, ...) plot the full pool rather than being
// silently capped to the ~60 players who've also recorded a stat line.
const batByName = new Map(battingRows.map(r => [r.name, r]));
const pitchByName = new Map(pitchingRows.map(r => [r.name, r]));
const allNames = new Set([...battingRows.map(r=>r.name), ...pitchingRows.map(r=>r.name), ...allBios.map(b=>b.name)]);
const explorerPlayers = [...allNames].map(name => {
  const bat = batByName.get(name) || {};
  const pit = pitchByName.get(name) || {};
  const bio = bioMap.get(name) || {};
  const team = bat.team || pit.team || bio.team;
  const age = bat.age ?? pit.age ?? bio.age ?? null;
  return {
    name, team, pos: bat.pos || pit.pos || bio.pos || null, age,
    bats: bio.bats ?? null, throws: bio.throws ?? null,
    country: bio.hometown ? countryOf(bio.hometown) : null,
    homeState: bio.hometown ? stateOf(bio.hometown) : null,
    draftRound: bio.round ?? null, draftPick: bio.pickOverall ?? null,
    distanceFromSpringfieldMi: distanceFromSpringfield(bio.hometown),
    status: bio.status ?? null, url: bat.url || pit.url || bio.url || null,
    G: bat.G ?? null, PA: bat.PA ?? null, AB: bat.AB ?? null, R: bat.R ?? null, H: bat.H ?? null,
    HR: bat.HR ?? null, RBI: bat.RBI ?? null, BB: bat.BB ?? null, SO: bat.SO ?? null, SB: bat.SB ?? null,
    AVG: bat.AVG ?? null, OBP: bat.OBP ?? null, SLG: bat.SLG ?? null, OPS: bat.OPS ?? null,
    IP: pit.IP ?? null, ERA: pit.ERA ?? null, WHIP: pit.WHIP ?? null, W: pit.W ?? null, L: pit.L ?? null,
    SV: pit.SV ?? null, K_pitch: pit.SO ?? null, BB_allowed: pit.BB ?? null, ER: pit.ER ?? null,
  };
}).filter(p => p.team);

const result = {
  scrapedAt: raw.scrapedAt,
  teams, teamCodes,
  qualBatters, sbLeaders, qualPitchers, soLeaders,
  bio: {
    avgAge, medianAge, minAge: Math.min(...ages), maxAge: Math.max(...ages), countryCount: nationality.length,
    ageDist, nationality, avgAgeByTeam, batsSplit, throwsSplit, rosterByTeam, total: allBios.length,
    signedCount: allBios.filter(b => b.status === 'Signed').length,
    draftedCount: allBios.filter(b => b.status === 'Drafted').length,
  },
  correlations, pca_explained: pcaExplained, pcaPlayers,
  sbCorrelationPoints: ageSbBatters,
  explorerPlayers, teamStats,
  clusterLoadings, featureLabels: FEATURE_LABELS,
};

fs.writeFileSync('./output/result.json', JSON.stringify(result, null, 2));
console.log('Wrote result.json —', teams.length, 'teams,', qualBatters.length, 'qual batters,', qualPitchers.length, 'qual pitchers,', allBios.length, 'total drafted players.');
