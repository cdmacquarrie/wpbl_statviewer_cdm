const cheerio = require('cheerio');
const fs = require('fs');

const BASE = 'https://www.womensprobaseballleague.com';

function rowStats($, tr) {
  const o = {};
  $(tr).find('td[data-stat-column]').each((i, td) => {
    const key = $(td).attr('data-stat-column');
    const val = $(td).attr('data-value');
    o[key] = val === '' || val === undefined ? null : Number(val);
  });
  return o;
}

async function scrapeStats() {
  const html = await fetch(`${BASE}/stats/`).then(r => r.text());
  const $ = cheerio.load(html);
  const tables = $('table');

  const batting = $(tables[0]).find('tbody tr').map((i, tr) => {
    const name = $(tr).find('.wpbl-league-stats__player-link').text().trim();
    const url = $(tr).find('.wpbl-league-stats__player-link').attr('href');
    const team = $(tr).find('td a[href*="/teams/"]').text().trim();
    const pos = $(tr).find('td[data-value]').eq(0).text().trim();
    return { name, url, team, pos, ...rowStats($, tr) };
  }).get().filter(r => r.name);

  const pitching = $(tables[1]).find('tbody tr').map((i, tr) => {
    const name = $(tr).find('.wpbl-league-stats__player-link').text().trim();
    const url = $(tr).find('.wpbl-league-stats__player-link').attr('href');
    const team = $(tr).find('td a[href*="/teams/"]').text().trim();
    const pos = $(tr).find('td[data-value]').eq(0).text().trim();
    return { name, url, team, pos, ...rowStats($, tr) };
  }).get().filter(r => r.name);

  const teamBatting = $(tables[3]).find('tbody tr').map((i, tr) => {
    const team = $(tr).find('.wpbl-league-stats__name').attr('data-value');
    return { team, ...rowStats($, tr) };
  }).get().filter(r => r.team);

  const teamPitching = $(tables[4]).find('tbody tr').map((i, tr) => {
    const team = $(tr).find('.wpbl-league-stats__name').attr('data-value');
    return { team, ...rowStats($, tr) };
  }).get().filter(r => r.team);

  const teamFielding = $(tables[5]).find('tbody tr').map((i, tr) => {
    const team = $(tr).find('.wpbl-league-stats__name').attr('data-value');
    return { team, ...rowStats($, tr) };
  }).get().filter(r => r.team);

  return { battingRaw: batting, pitchingRaw: pitching, teamBatting, teamPitching, teamFielding };
}

async function scrapeBios() {
  const html = await fetch(`${BASE}/prospect-ranking/`).then(r => r.text());
  const $ = cheerio.load(html);
  const rows = $('table tbody tr').map((i, tr) => {
    const tds = $(tr).find('td').map((j, td) => $(td).text().trim()).get();
    return {
      name: tds[0], age: tds[1] ? Number(tds[1]) : null, pos: tds[2], hometown: tds[3],
      bats: tds[4], throws: tds[5], team: tds[6], status: tds[7], draftSelection: tds[8] || null,
      url: $(tr).attr('data-url'),
    };
  }).get();
  return rows.filter(r => r.status === 'Signed');
}

(async () => {
  const [stats, bios] = await Promise.all([scrapeStats(), scrapeBios()]);
  const out = { scrapedAt: new Date().toISOString(), ...stats, bios };
  fs.writeFileSync('./output/raw_data.json', JSON.stringify(out, null, 2));
  console.log(`Scraped ${stats.battingRaw.length} batters, ${stats.pitchingRaw.length} pitchers, ${bios.length} signed bios, ${stats.teamBatting.length} teams.`);
})().catch(e => { console.error(e); process.exit(1); });
