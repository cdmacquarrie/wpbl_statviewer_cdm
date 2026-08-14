const fs = require('fs');

// Community-maintained Retrosheet-style game logs for the 2026 WPBL season, by
// u/revuetext (GitHub: exu6jh/RetroWPBL) - https://github.com/exu6jh/RetroWPBL
// Hand-verified against game broadcasts. This unlocks game-by-game season-trend
// charts our own /stats/ scrape can't produce (it only has season totals).
// Third-party and volunteer-maintained, so any fetch/parse failure here must
// degrade gracefully (empty game list) rather than break the rest of the pipeline.
const GAMELOG_URL = 'https://raw.githubusercontent.com/exu6jh/RetroWPBL/main/gamelogs/gl2026.txt';
const TEAM_MAP = { LAQ: 'LA', NYH: 'NY', SFF: 'SF', BSH: 'BOS' };

function parseCsvLine(line) {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  let games = [];
  try {
    const res = await fetch(GAMELOG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    games = text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const f = parseCsvLine(line);
      const visTeam = TEAM_MAP[f[3]], homeTeam = TEAM_MAP[f[6]];
      return { date: f[0], visTeam, homeTeam, visScore: +f[9], homeScore: +f[10] };
    }).filter(g => g.visTeam && g.homeTeam && Number.isFinite(g.visScore) && Number.isFinite(g.homeScore))
      .sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Fetched ${games.length} games from RetroWPBL gamelog.`);
  } catch (e) {
    console.warn('RetroWPBL gamelog fetch failed, continuing without season-trend data:', e.message);
    games = [];
  }
  fs.writeFileSync('./output/retrowpbl_gamelogs.json', JSON.stringify(games, null, 2));
}

main();
