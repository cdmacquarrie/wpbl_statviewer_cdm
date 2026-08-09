const { execSync } = require('child_process');
const fs = require('fs');

if (!fs.existsSync('./output')) fs.mkdirSync('./output');

const steps = ['scrape.js', 'analyze.js', 'build_stats.js', 'build_bios.js', 'build_analytics.js', 'build_explorer.js', 'build_dashboard.js'];
for (const step of steps) {
  console.log(`\n--- running ${step} ---`);
  execSync(`node ${step}`, { stdio: 'inherit' });
}
console.log('\nAll done. Generated files in ./output/: wpbl_stats.html, wpbl_bios.html, wpbl_analytics.html, wpbl_explorer.html, wpbl_dashboard.html');
