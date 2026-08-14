const fs = require('fs');

// Community-maintained Retrosheet-style game logs + schedule for the 2026 WPBL
// season, by u/revuetext (GitHub: exu6jh/RetroWPBL) -
// https://github.com/exu6jh/RetroWPBL. Hand-verified against game broadcasts.
// This unlocks game-by-game season-trend charts and a remaining-schedule list
// our own /stats/ scrape can't produce (it only has season totals, no per-game
// breakdown and no future schedule at all). Third-party and volunteer-
// maintained, so any fetch/parse failure here must degrade gracefully (empty
// list) rather than break the rest of the pipeline.
const GAMELOG_URL = 'https://raw.githubusercontent.com/exu6jh/RetroWPBL/main/gamelogs/gl2026.txt';
const SCHEDULE_URL = 'https://raw.githubusercontent.com/exu6jh/RetroWPBL/main/schedules/2026schedule.csv';
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

async function fetchGameLogs() {
  const res = await fetch(GAMELOG_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const f = parseCsvLine(line);
    const visTeam = TEAM_MAP[f[3]], homeTeam = TEAM_MAP[f[6]];
    return { date: f[0], visTeam, homeTeam, visScore: +f[9], homeScore: +f[10] };
  }).filter(g => g.visTeam && g.homeTeam && Number.isFinite(g.visScore) && Number.isFinite(g.homeScore))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchSchedule() {
  const res = await fetch(SCHEDULE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  lines.shift(); // header row
  return lines.map(line => {
    const f = parseCsvLine(line);
    const visTeam = TEAM_MAP[f[3]], homeTeam = TEAM_MAP[f[6]];
    return { date: f[0], day: f[2], visTeam, homeTeam, dayNight: f[9], postponed: !!f[11] };
  }).filter(g => g.visTeam && g.homeTeam).sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
  let games = [];
  try {
    games = await fetchGameLogs();
    console.log(`Fetched ${games.length} games from RetroWPBL gamelog.`);
  } catch (e) {
    console.warn('RetroWPBL gamelog fetch failed, continuing without season-trend data:', e.message);
  }
  fs.writeFileSync('./output/retrowpbl_gamelogs.json', JSON.stringify(games, null, 2));

  let schedule = [];
  try {
    schedule = await fetchSchedule();
    console.log(`Fetched ${schedule.length} scheduled games from RetroWPBL.`);
  } catch (e) {
    console.warn('RetroWPBL schedule fetch failed, continuing without schedule data:', e.message);
  }
  fs.writeFileSync('./output/retrowpbl_schedule.json', JSON.stringify(schedule, null, 2));
}

main();
