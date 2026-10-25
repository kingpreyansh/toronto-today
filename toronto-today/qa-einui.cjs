const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

const probe = () => {
  const glass = document.querySelector('.wx-glass');
  if (!glass) return {glassPresent: false};
  const inner = glass.querySelector('div > div');
  const cs = inner ? getComputedStyle(inner) : null;
  let minFont = 999;
  glass.querySelectorAll('*').forEach(el => {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (own) minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize));
  });
  const svgs = [...glass.querySelectorAll('svg')];
  return {
    glassPresent: true,
    glassWidth: Math.round(glass.getBoundingClientRect().width),
    backdropFilter: cs ? (cs.backdropFilter || cs.webkitBackdropFilter) : null,
    borderColor: cs ? cs.borderTopColor : null,
    borderRadius: cs ? cs.borderTopLeftRadius : null,
    widgetText: glass.textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
    iconCount: svgs.length,
    iconWidths: svgs.map(s => Math.round(s.getBoundingClientRect().width)).filter(Boolean),
    minFont,
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
};

(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    const page = await browser.newPage({viewport: {width, height}});
    const errs = [];
    const external = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
    page.on('request', r => {
      const u = r.url();
      if (!u.startsWith('https://today.getphiads.com') && !u.startsWith('data:')) external.push(u.slice(0, 90));
    });

    await page.goto('https://today.getphiads.com/', {waitUntil: 'networkidle'});
    await page.waitForSelector('.wx-glass', {timeout: 20000});
    await page.waitForTimeout(2500);

    const out = await page.evaluate(probe);
    await page.screenshot({path: `/home/ubuntu/phiads-odysseus/toronto-today/qa-einui-${name}.png`, clip: {x: 0, y: 0, width, height: Math.min(height, 1000)}});
    results.push({name, ...out, externalRequests: [...new Set(external)], errs});
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  const bad = results.some(r => !r.glassPresent || r.errs.length || r.overflow || r.externalRequests.length);
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
