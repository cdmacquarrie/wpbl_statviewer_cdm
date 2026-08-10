const fs = require('fs');

const CACHE_PATH = './hometown_geocache.json';
const SPRINGFIELD_IL = { lat: 39.7817, lon: -89.6501 }; // where every 2026 WPBL game is played

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'wpbl-stats-dashboard/1.0 (personal fan project)' } });
  const data = await res.json();
  return data.length ? { lat: +data[0].lat, lon: +data[0].lon } : null;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync('./output/raw_data.json', 'utf8'));
  const hometowns = [...new Set(raw.bios.map(b => b.hometown).filter(Boolean))];

  let cache = {};
  if (fs.existsSync(CACHE_PATH)) cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));

  const missing = hometowns.filter(h => !(h in cache));
  for (const h of missing) {
    const coords = await geocode(h);
    if (coords) {
      const mi = haversineMiles(coords.lat, coords.lon, SPRINGFIELD_IL.lat, SPRINGFIELD_IL.lon);
      cache[h] = { ...coords, distanceFromSpringfieldMi: +mi.toFixed(1) };
      console.log(`  ${h} -> ${mi.toFixed(0)} mi`);
    } else {
      console.warn(`  no geocode match for "${h}"`);
      cache[h] = null;
    }
    if (missing.indexOf(h) < missing.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`Geocode cache: ${Object.keys(cache).length} hometowns (${missing.length} newly geocoded this run).`);
}

main().catch(e => { console.error(e); process.exit(1); });
