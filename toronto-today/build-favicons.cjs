const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');

// Render the favicon SVG to the PNG sizes browsers want, then wrap one in a
// real .ico container (ICO supports an embedded PNG), so /favicon.ico also works.
const ROOT = '/home/ubuntu/phiads-odysseus/toronto-today/public';
const svg = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8');

function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: icon
  header.writeUInt16LE(1, 4);   // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);  // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1);  // height
  entry.writeUInt8(0, 2);       // palette
  entry.writeUInt8(0, 3);       // reserved
  entry.writeUInt16LE(1, 4);    // colour planes
  entry.writeUInt16LE(32, 6);   // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(6 + 16, 12);  // offset to image data
  return Buffer.concat([header, entry, pngBuffer]);
}

(async () => {
  const browser = await chromium.launch({headless: true});
  const outputs = [];
  for (const [name, size] of [['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['favicon-16.png', 16], ['icon-512.png', 512]]) {
    const page = await browser.newPage({viewport: {width: size, height: size}, deviceScaleFactor: 1});
    // Transparent page, SVG scaled to fill exactly.
    await page.setContent(
      `<body style="margin:0;background:transparent">` +
      `<div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`,
    );
    await page.waitForTimeout(150);
    const file = path.join(ROOT, name);
    await page.screenshot({path: file, omitBackground: true});
    const bytes = fs.statSync(file).size;
    outputs.push({name, size, bytes});
    if (size === 32) fs.writeFileSync(path.join(ROOT, 'favicon.ico'), pngToIco(fs.readFileSync(file), 32));
    await page.close();
  }
  await browser.close();
  outputs.push({name: 'favicon.ico', size: 32, bytes: fs.statSync(path.join(ROOT, 'favicon.ico')).size});
  console.log(JSON.stringify(outputs, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });