const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

// Walks every visible leaf of text and reports the computed font size, so a
// "subtext is too small" regression is caught by measurement, not by eye.
const AUDIT = () => {
  const out = [];
  const walk = el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (own) {
      out.push({
        size: Math.round(parseFloat(style.fontSize) * 10) / 10,
        text: own.slice(0, 42),
        cls: (el.className && typeof el.className === 'string' ? el.className : el.tagName).split(' ')[0],
      });
    }
    for (const child of el.children) walk(child);
  };
  walk(document.body);
  return out;
};

(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const [name, width, height, floor] of [['desktop', 1440, 1000, 13], ['tablet', 768, 1000, 13], ['phone', 390, 844, 13], ['narrow', 320, 800, 13]]) {
    const page = await browser.newPage({viewport: {width, height}});
    await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.wx-deck', {timeout: 20000});
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const nodes = await page.evaluate(AUDIT);
    const below = nodes.filter(n => n.size < floor);
    const sizes = nodes.map(n => n.size).sort((a, b) => a - b);
    results.push({
      name,
      sampled: nodes.length,
      min: sizes[0],
      floor,
      belowCount: below.length,
      below: below.slice(0, 8),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.some(r => r.belowCount || r.overflow) ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
