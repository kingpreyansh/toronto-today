const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const [name, width, height] of [['desktop', 1320, 950], ['phone', 390, 844], ['narrow', 320, 800]]) {
    const page = await browser.newPage({viewport: {width, height}});
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.weather-glyph', {timeout: 20000});
    await page.waitForTimeout(2500);
    const out = await page.evaluate(async () => {
      const glyph = document.querySelector('.weather-glyph');
      const outlookGlyphs = [...document.querySelectorAll('.weather-outlook img')];
      await Promise.all([glyph, ...outlookGlyphs].filter(Boolean).map(i => i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; })));
      return {
        tone: document.querySelector('.weather').dataset.tone,
        glyphTag: glyph.tagName,
        glyphSrc: glyph.getAttribute('src'),
        glyphLoaded: glyph.tagName === 'IMG' ? glyph.naturalWidth > 0 : null,
        glyphBox: Math.round(glyph.getBoundingClientRect().width),
        outlookCount: outlookGlyphs.length,
        outlookLoaded: outlookGlyphs.filter(i => i.complete && i.naturalWidth > 0).length,
        outlookBroken: outlookGlyphs.filter(i => i.complete && i.naturalWidth === 0).length,
        metricIcons: document.querySelectorAll('.weather-metrics svg').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        crossOrigin: [...document.querySelectorAll('img')].map(i => i.getAttribute('src')).filter(s => s && !s.startsWith('/')),
      };
    });
    await page.screenshot({path: `/home/ubuntu/phiads-odysseus/toronto-today/qa-weather-${name}.png`, clip: {x: 0, y: 0, width, height: Math.min(height, 950)}});
    results.push({name, ...out, errs});
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  const bad = results.some(r => r.errs.length || r.overflow || r.crossOrigin.length || r.glyphLoaded === false || r.outlookBroken);
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
