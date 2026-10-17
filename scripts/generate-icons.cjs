const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function getSvg(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32; // Fits safely in maskable 80% safe zone
  const nodeRadius = size * 0.038;
  const centerRadius = size * 0.06;

  const points = [];
  for (let i = 0; i < 11; i++) {
    const angle = (i * 2 * Math.PI / 11) - (Math.PI / 2);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push({ x, y });
  }

  let centerSpokes = '';
  for (const pt of points) {
    centerSpokes += `<line x1="${cx}" y1="${cy}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" stroke="#264E7A" stroke-width="${(size * 0.005).toFixed(1)}" stroke-dasharray="3,3" />\n`;
  }

  let nodesSvg = '';
  points.forEach((pt, i) => {
    const color = i % 2 === 0 ? '#1AA6A0' : '#4FC3F7';
    nodesSvg += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${nodeRadius.toFixed(1)}" fill="${color}" stroke="#FFFFFF" stroke-width="${(size * 0.008).toFixed(1)}" />\n`;
  });

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <!-- Background for maskable icon -->
    <rect width="${size}" height="${size}" fill="#17375E" />
    
    <!-- Outer halo ring -->
    <circle cx="${cx}" cy="${cy}" r="${(r * 1.15).toFixed(1)}" stroke="#1F4876" stroke-width="${(size * 0.01).toFixed(1)}" fill="none" />
    
    <!-- Spoke lines -->
    ${centerSpokes}

    <!-- Ring circle -->
    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" stroke="#4A90E2" stroke-width="${(size * 0.012).toFixed(1)}" fill="none" />

    <!-- 11 Pattern Nodes -->
    ${nodesSvg}

    <!-- Center node -->
    <circle cx="${cx}" cy="${cy}" r="${(centerRadius * 1.3).toFixed(1)}" fill="#1F4876" />
    <circle cx="${cx}" cy="${cy}" r="${centerRadius.toFixed(1)}" fill="#1AA6A0" stroke="#FFFFFF" stroke-width="${(size * 0.01).toFixed(1)}" />
    <circle cx="${cx}" cy="${cy}" r="${(centerRadius * 0.4).toFixed(1)}" fill="#FFFFFF" />
  </svg>
  `;
}

async function run() {
  const svg192 = Buffer.from(getSvg(192));
  await sharp(svg192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Generated public/icons/icon-192.png');

  const svg512 = Buffer.from(getSvg(512));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Generated public/icons/icon-512.png');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
